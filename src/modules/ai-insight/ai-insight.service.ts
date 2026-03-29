import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Hashids from 'hashids';
import { Repository } from 'typeorm';
import { AiJob, AiJobStatus } from '../ai-jobs/entities/ai-job.entity';
import { Order } from '../orders/entities/order.entity';
import { ProductBatch } from '../product-batches/entities/product-batch.entity';
import { ProductStock } from '../product-stocks/entities/product-stock.entity';
import { StockMovement, ReferenceType } from '../stock-movements/entities/stock-movement.entity';
import { AiInsight, InsightType } from './entities/ai-insight.entity';
import { PosSession } from '../pos-sessions/entities/pos-session.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { Refund } from '../payments/entities/refund.entity';

@Injectable()
export class AiInsightService {
  constructor(
    @InjectRepository(AiInsight)
    private readonly aiInsightRepository: Repository<AiInsight>,
    @InjectRepository(AiJob)
    private readonly aiJobRepository: Repository<AiJob>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(ProductStock)
    private readonly productStockRepository: Repository<ProductStock>,
    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,
    @InjectRepository(ProductBatch)
    private readonly productBatchRepository: Repository<ProductBatch>,
    @InjectRepository(PosSession)
    private readonly posSessionRepository: Repository<PosSession>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Refund)
    private readonly refundRepository: Repository<Refund>,
    private readonly configService: ConfigService,
  ) {}

  async findAll(branchId: string) {
    return await this.aiInsightRepository.find({
      where: { branch: { id: branchId } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const insight = await this.aiInsightRepository.findOne({ where: { id } });
    if (!insight) {
      throw new HttpException('Insight not found', HttpStatus.NOT_FOUND);
    }
    return insight;
  }

  async generateInsights(branchId: string, timeRange: string = 'monthly', force: boolean = false) {
    const isDevelopment = (this.configService.get<string>('NODE_ENV') || process.env.NODE_ENV) === 'development';

    const job = new AiJob();
    job.branch = { id: branchId } as any;

    // Check for recent generation (cooldown of 12 hours for production)
    const lastSummary = await this.aiInsightRepository.findOne({
      where: { branch: { id: branchId }, type: InsightType.REPORT_SUMMARY },
      order: { createdAt: 'DESC' },
    });

    if (!force && !isDevelopment && lastSummary && (Date.now() - new Date(lastSummary.createdAt).getTime() < 12 * 60 * 60 * 1000)) { // 12 hours
      console.log(`[AI] Skipping generation for branch ${branchId} due to 12h cooldown.`);
      return {
        success: true,
        message: 'Insights were recently generated. Using existing data.',
        data: lastSummary.metadata,
      };
    }

    job.status = AiJobStatus.PENDING;
    job.payload = [`Generate Insights (${timeRange})`];
    job.generateId();
    await this.aiJobRepository.save(job);

    try {
      job.status = AiJobStatus.PROCESSING;
      await this.aiJobRepository.save(job);

      // 1. Gather rich, contextual data
      const salesData = await this.getSalesData(branchId, timeRange);
      const stockData = await this.getStockData(branchId, timeRange);
      const stockAnomalyData = await this.getAnomalyData(branchId, timeRange);
      const expiryData = await this.getExpiryData(branchId);
      const operationalAnomalyData = await this.getOperationalAnomalies(branchId, timeRange);

      const promptData = {
        time_range: timeRange,
        // Sales intelligence
        daily_revenue_trend: salesData.dailySales,
        top_selling_products: salesData.topProducts,
        slow_moving_products: salesData.slowMovingProducts,
        dead_stock_products: salesData.deadStockProducts,
        // Stock intelligence
        critical_low_stock: stockData.criticalLowStock,
        overstock_candidates: stockData.overstockCandidates,
        // Expiry intelligence
        batches_expiring_soon: expiryData.expiringSoon,
        // Anomaly intelligence
        stock_anomalies: stockAnomalyData.suspiciousMovements,
        operational_anomalies: operationalAnomalyData,
      };

      // 2. Call AI (or rule-based fallback)
      const aiResponse = await this.callOpenAI(promptData);

      // 3. Save insights
      await this.saveInsights(aiResponse, branchId);

      job.status = AiJobStatus.COMPLETED;
      job.result = aiResponse;
      await this.aiJobRepository.save(job);

      return {
        success: true,
        message: 'AI Insights generated successfully',
        data: aiResponse,
        jobId: job.id,
      };
    } catch (error) {
      job.status = AiJobStatus.FAILED;
      job.result = [error.message];
      await this.aiJobRepository.save(job);

      throw error;
    }
  }

  private mapToInsightType(type: string): InsightType {
    const normalized = type.toLowerCase().replace(/\s+/g, '_');

    const validTypes = Object.values(InsightType);
    if (validTypes.includes(normalized as InsightType)) {
      return normalized as InsightType;
    }

    if (normalized.includes('overstock')) return InsightType.STOCK_SUGGESTION;
    if (normalized.includes('restock')) return InsightType.STOCK_SUGGESTION;
    if (normalized.includes('sales')) return InsightType.SALES_TREND;
    if (normalized.includes('best')) return InsightType.BEST_SELLER;
    if (normalized.includes('slow')) return InsightType.SLOW_MOVING;
    if (normalized.includes('dead')) return InsightType.SLOW_MOVING;
    if (normalized.includes('low')) return InsightType.LOW_STOCK_ALERT;
    if (normalized.includes('expiry') || normalized.includes('expire')) return InsightType.EXPIRY_ALERT;
    if (normalized.includes('anomaly') || normalized.includes('shrinkage')) return InsightType.ANOMALY_ALERT;
    if (normalized.includes('promo')) return InsightType.PROMO_SUGGESTION;

    return InsightType.REPORT_SUMMARY;
  }

  /**
   * Sales data: daily trend, top-selling, slow-moving, and dead stock (with current stock context).
   */
  private async getSalesData(branchId: string, timeRange: string = 'monthly') {
    const startDate = new Date();
    switch (timeRange) {
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'yearly':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default: // monthly
        startDate.setDate(startDate.getDate() - 30);
        break;
    }

    // Daily revenue trend (using Payment table for accuracy with dashboard)
    const dailySales = await this.paymentRepository
      .createQueryBuilder('pay')
      .select("TO_CHAR(pay.paid_at, 'YYYY-MM-DD')", 'date')
      .addSelect('SUM(pay.amount)', 'totalRevenue')
      .addSelect('COUNT(pay.id)', 'totalOrders')
      .innerJoin('pay.order', 'ord')
      .where('ord.branch_id = :branchId', { branchId })
      .andWhere('pay.paid_at >= :startDate', { startDate })
      .andWhere('pay.status = :status', { status: PaymentStatus.SUCCESS })
      .groupBy("TO_CHAR(pay.paid_at, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany();

    // Top-selling products with current stock context
    const topProducts = await this.orderRepository
      .createQueryBuilder('ord')
      .innerJoin('ord.items', 'item')
      .innerJoin('item.variant', 'variant')
      .innerJoin('variant.product', 'product')
      .leftJoin(
        'variant.productStocks',
        'stock',
        'stock.branch_id = :branchId',
        { branchId },
      )
      .select('product.name_product', 'productName')
      .addSelect('variant.name_variant', 'variantName')
      .addSelect('variant.sku', 'sku')
      .addSelect('SUM(item.quantity)', 'totalUnitsSold')
      .addSelect('SUM(item.subtotal)', 'totalRevenue')
      .addSelect('MAX(stock.stock)', 'currentStock')
      .addSelect('MAX(stock.minStock)', 'minStock')
      .where('ord.branch_id = :branchId', { branchId })
      .andWhere('ord.createdAt >= :startDate', { startDate })
      .andWhere("ord.status = 'completed'")
      .groupBy('product.name_product')
      .addGroupBy('variant.name_variant')
      .addGroupBy('variant.sku')
      .orderBy('"totalUnitsSold"', 'DESC')
      .limit(10)
      .getRawMany();

    // Slow-moving: products with very low sales but significant stock
    const slowMovingProducts = await this.orderRepository
      .createQueryBuilder('ord')
      .innerJoin('ord.items', 'item')
      .innerJoin('item.variant', 'variant')
      .innerJoin('variant.product', 'product')
      .leftJoin(
        'variant.productStocks',
        'stock',
        'stock.branch_id = :branchId',
        { branchId },
      )
      .select('product.name_product', 'productName')
      .addSelect('variant.name_variant', 'variantName')
      .addSelect('SUM(item.quantity)', 'totalUnitsSold')
      .addSelect('SUM(item.subtotal)', 'totalRevenue')
      .addSelect('MAX(stock.stock)', 'currentStock')
      .where('ord.branch_id = :branchId', { branchId })
      .andWhere('ord.createdAt >= :startDate', { startDate })
      .andWhere("ord.status = 'completed'")
      .groupBy('product.name_product')
      .addGroupBy('variant.name_variant')
      .having('SUM(item.quantity) < 5')
      .andHaving('MAX(stock.stock) > 10')
      .orderBy('"currentStock"', 'DESC')
      .limit(10)
      .getRawMany();

    // Dead stock: products with stock but ZERO sales in the period
    // Use a simple approach: get all stocks with > 5 units, then filter out those with sales
    const deadStockProducts = await this.productStockRepository
      .createQueryBuilder('stock')
      .innerJoin('stock.productVariant', 'variant')
      .innerJoin('variant.product', 'product')
      .select('product.name_product', 'productName')
      .addSelect('variant.name_variant', 'variantName')
      .addSelect('variant.sku', 'sku')
      .addSelect('stock.stock', 'currentStock')
      .where('stock.branch_id = :branchId', { branchId })
      .andWhere('stock.stock > 5')
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM order_items oi
          INNER JOIN orders o ON o.id = oi.order_id
          WHERE oi.variant_id = variant.id
          AND o.branch_id = :branchId
          AND o.status = 'completed'
          AND o."createdAt" >= :startDate
        )`,
        { branchId, startDate },
      )
      .orderBy('stock.stock', 'DESC')
      .limit(10)
      .getRawMany();

    return { dailySales, topProducts, slowMovingProducts, deadStockProducts };
  }

  /**
   * Stock data: critical low stock and overstock candidates.
   */
  private async getStockData(branchId: string, timeRange: string = 'monthly') {
    const startDate = new Date();
    switch (timeRange) {
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'yearly':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
        break;
    }

    // Products at or below minStock
    const criticalLowStock = await this.productStockRepository
      .createQueryBuilder('stock')
      .innerJoin('stock.productVariant', 'variant')
      .innerJoin('variant.product', 'product')
      .select('product.name_product', 'productName')
      .addSelect('variant.name_variant', 'variantName')
      .addSelect('variant.sku', 'sku')
      .addSelect('stock.stock', 'currentStock')
      .addSelect('stock.minStock', 'minStock')
      .where('stock.branch_id = :branchId', { branchId })
      .andWhere('stock.stock <= stock.minStock')
      .orderBy('stock.stock', 'ASC')
      .limit(10)
      .getRawMany();

    // Overstock: high stock, low sales velocity (using subquery for sales count)
    const overstockCandidates = await this.productStockRepository
      .createQueryBuilder('stock')
      .innerJoin('stock.productVariant', 'variant')
      .innerJoin('variant.product', 'product')
      .select('product.name_product', 'productName')
      .addSelect('variant.name_variant', 'variantName')
      .addSelect('variant.sku', 'sku')
      .addSelect('stock.stock', 'currentStock')
      .addSelect('stock.minStock', 'minStock')
      .addSelect(
        `(
          SELECT COALESCE(SUM(oi.quantity), 0)
          FROM order_items oi
          INNER JOIN orders o ON o.id = oi.order_id
          WHERE oi.variant_id = variant.id
          AND o.branch_id = :branchId
          AND o.status = 'completed'
          AND o."createdAt" >= :startDate
        )`,
        'unitsSold',
      )
      .where('stock.branch_id = :branchId', { branchId })
      .andWhere('stock.stock > 50')
      .setParameters({ branchId, startDate })
      .orderBy('stock.stock', 'DESC')
      .limit(5)
      .getRawMany()
      .then((rows) => rows.filter((r) => parseInt(r.unitsSold || '0') < 3));

    return { criticalLowStock, overstockCandidates };
  }

  /**
   * Expiry data: product batches expiring within 30 days.
   */
  private async getExpiryData(branchId: string) {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringSoon = await this.productBatchRepository
      .createQueryBuilder('batch')
      .innerJoin('batch.productVariant', 'variant')
      .innerJoin('variant.product', 'product')
      .select('product.name_product', 'productName')
      .addSelect('variant.name_variant', 'variantName')
      .addSelect('variant.sku', 'sku')
      .addSelect('batch.batchNumber', 'batchNumber')
      .addSelect('batch.expiryDate', 'expiryDate')
      .addSelect('batch.currentQuantity', 'currentQuantity')
      .where('batch.branch_id = :branchId', { branchId })
      .andWhere('batch.expiryDate >= :today', { today })
      .andWhere('batch.expiryDate <= :thirtyDaysFromNow', { thirtyDaysFromNow })
      .andWhere('batch.currentQuantity > 0')
      .orderBy('batch.expiryDate', 'ASC')
      .getRawMany();

    return { expiringSoon };
  }

  /**
   * Anomaly data: suspicious stock movement patterns (damage, unexplained adjustments).
   */
  private async getAnomalyData(branchId: string, timeRange: string = 'monthly') {
    const startDate = new Date();
    switch (timeRange) {
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'yearly':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
        break;
    }

    const suspiciousMovements = await this.stockMovementRepository
      .createQueryBuilder('movement')
      .innerJoin('movement.productVariant', 'variant')
      .innerJoin('variant.product', 'product')
      .select('product.name_product', 'productName')
      .addSelect('variant.name_variant', 'variantName')
      .addSelect('variant.sku', 'sku')
      .addSelect('movement.referenceType', 'referenceType')
      .addSelect('movement.qty', 'qty')
      .addSelect('movement.reason', 'reason')
      .addSelect("TO_CHAR(movement.createdAt, 'YYYY-MM-DD')", 'date')
      .where('movement.branch_id = :branchId', { branchId })
      .andWhere('movement.createdAt >= :startDate', { startDate })
      .andWhere('movement.qty < 0')
      .andWhere(
        `movement.referenceType IN ('${ReferenceType.DAMAGE}', '${ReferenceType.ADJUST}', '${ReferenceType.EXPIRED}', '${ReferenceType.STOCK_TAKE}')`,
      )
      .orderBy('movement.qty', 'ASC')
      .limit(10)
      .getRawMany();

    return { suspiciousMovements };
  }

  /**
   * Operational anomalies: Cash discrepancies, refund/void patterns, discount spikes, and timing.
   */
  private async getOperationalAnomalies(branchId: string, timeRange: string = 'monthly') {
    const startDate = new Date();
    switch (timeRange) {
      case 'weekly': startDate.setDate(startDate.getDate() - 7); break;
      case 'yearly': startDate.setFullYear(startDate.getFullYear() - 1); break;
      default: startDate.setDate(startDate.getDate() - 30); break;
    }

    // 1. Cash Discrepancies (Sesi POS dengan selisih)
    const sessionDiscrepancies = await this.posSessionRepository
      .createQueryBuilder('session')
      .leftJoin('session.user', 'user')
      .select('session.id', 'sessionId')
      .addSelect('user.name', 'cashierName')
      .addSelect('session.expected_cash', 'expectedAmount')
      .addSelect('session.closingBalance', 'actualAmount')
      .addSelect('session.difference', 'difference')
      .addSelect('session.endTime', 'closedAt')
      .where('session.branch_id = :branchId', { branchId })
      .andWhere('session.status = \'closed\'')
      .andWhere('session.endTime >= :startDate', { startDate })
      .andWhere('ABS(session.difference) > 0') // Hanya yang ada selisih
      .orderBy('session.endTime', 'DESC')
      .getRawMany();

    // 2. Refund Patterns per Cashier
    const refundPatterns = await this.refundRepository
      .createQueryBuilder('refund')
      .innerJoin('refund.order', 'ord')
      .innerJoin('ord.user', 'user')
      .select('user.name', 'cashierName')
      .addSelect('COUNT(refund.id)', 'totalRefunds')
      .addSelect('SUM(refund.amount)', 'totalRefundAmount')
      .where('ord.branch_id = :branchId', { branchId })
      .andWhere('refund.createdAt >= :startDate', { startDate })
      .groupBy('user.name')
      .having('COUNT(refund.id) > 2') // Minimal 3 refund untuk dianggap pola
      .getRawMany();

    // 3. Discount Spikes per Cashier (Rasio diskon terhadap subtotal)
    const discountSpikes = await this.orderRepository
      .createQueryBuilder('ord')
      .innerJoin('ord.user', 'user')
      .select('user.name', 'cashierName')
      .addSelect('SUM(ord.subtotal)', 'totalSales')
      .addSelect('SUM(ord.discount_amount)', 'totalDiscounts')
      .addSelect('COUNT(ord.id)', 'orderCount')
      .where('ord.branch_id = :branchId', { branchId })
      .andWhere('ord.createdAt >= :startDate', { startDate })
      .andWhere('ord.status = \'completed\'')
      .groupBy('user.name')
      .having('SUM(ord.discount_amount) > 0')
      .getRawMany()
      .then(rows => rows.map(r => ({
        ...r,
        discountPercentage: (parseFloat(r.totalDiscounts) / parseFloat(r.totalSales)) * 100
      })));

    // 4. Activity Timing (lonjakan transaksi mendadak sebelum tutup)
    // Mencari pesanan yang terjadi dalam 30 menit terakhir sebelum sesi ditutup
    const preClosingActivity = await this.posSessionRepository
      .createQueryBuilder('session')
      .innerJoin('session.orders', 'ord')
      .innerJoin('session.user', 'user')
      .select('session.id', 'sessionId')
      .addSelect('user.name', 'cashierName')
      .addSelect('COUNT(ord.id)', 'lastMinuteOrders')
      .where('session.branch_id = :branchId', { branchId })
      .andWhere('session.status = \'closed\'')
      .andWhere('session.endTime >= :startDate', { startDate })
      .andWhere('ord.createdAt >= session.endTime - INTERVAL \'30 minutes\'')
      .groupBy('session.id, user.name')
      .having('COUNT(ord.id) >= 5') // Ambang batas aktivitas mencurigakan
      .getRawMany();

    return {
      session_discrepancies: sessionDiscrepancies,
      refund_patterns: refundPatterns,
      discount_analysis: discountSpikes,
      pre_closing_activity: preClosingActivity
    };
  }

  private async callOpenAI(data: any) {
    const apiKey = this.configService.get('AI_API_KEY');
    if (!apiKey || apiKey === 'your_ai_api_key_here') {
      return this.generateRuleBasedInsights(data);
    }

    const apiUrl =
      this.configService.get('AI_API_URL') ||
      'https://api.openai.com/v1/chat/completions';
    const model = this.configService.get('AI_MODEL') || 'gpt-4-turbo';

    const systemPrompt = `You are a precise retail business analyst for a POS system.
You output ONLY valid JSON. No markdown, no explanations, just JSON.
Your JSON must be an object with a key "insights" containing an array.`;

    const userPrompt = `Analyze this store data and return a JSON object with key "insights" containing an array of insight objects.

STORE DATA:
${JSON.stringify(data, null, 2)}

Each insight object must have:
- "type": one of ['report_summary', 'sales_trend', 'best_seller', 'slow_moving', 'low_stock_alert', 'expiry_alert', 'anomaly_alert', 'stock_suggestion', 'promo_suggestion']
- "summary": short specific human-readable title
- "metadata": structured object specific to the type

SPECIAL RULES FOR "report_summary":
The "report_summary" insight MUST contain:
- metadata.executive_summary: A 2-3 sentence narrative overview of the store's performance.
- metadata.highlights: An array of 3-5 strings representing key wins or concerns.
- metadata.total_revenue: The total revenue number.

RANKING RULES:
- Always refer to products in "top_selling_products" by their index + 1 ranking.
- Example: The product at index 0 is "the Best Selling Product (#1)", index 1 is "Second Best Selling (#2)", and index 2 is "Third Best Selling (#3)".
- Triple-check the data before assigning a rank in the text.

ANOMALY DETECTION RULES:
- For "operational_anomalies", identify high-risk behaviors:
  1. Cash Discrepancies: Flag any non-zero difference in "session_discrepancies".
  2. Refund Patterns: Flag cashiers with "totalRefundsCount" significantly higher than average.
  3. Discount Spikes: Flag cashiers whose "discountPercentage" exceeds 15% or store average.
  4. Activity Timing: Flag "pre_closing_activity" sessions with high transaction volume within 30m of close.
- For each anomaly, assign a metadata.risk_level: 'low', 'medium', or 'high'.
- Provide a metadata.audit_hint: A specific instruction for the manager (e.g., "Check CCTV between 10 PM and 10:30 PM", "Audit transaction #XYZ").

GENERAL RULES:
- Only use product names and SKUs from the actual data provided
- Do NOT fabricate products not in the data
- If data for a category is empty, skip that insight type
- Generate individual entries per product, not grouped lists`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API Error: ${response.statusText}`);
      }

      const result = await response.json();
      const content = result.choices[0].message.content;
      const parsed = JSON.parse(content);

      if (Array.isArray(parsed)) return parsed;
      if (parsed.insights && Array.isArray(parsed.insights)) return parsed.insights;
      const firstArrayVal = Object.values(parsed).find((v) => Array.isArray(v));
      return firstArrayVal || this.generateRuleBasedInsights(data);
    } catch (error) {
      return this.generateRuleBasedInsights(data);
    }
  }

  /**
   * Rule-based insight engine: generates insights from real DB data when no AI API key is set.
   * All product names come from the actual database — no hardcoded values.
   */
  private generateRuleBasedInsights(data: any): any[] {
    const insights: any[] = [];

    const totalRevenue = (data.daily_revenue_trend || []).reduce(
      (sum: number, d: any) => sum + parseFloat(d.totalRevenue || 0),
      0,
    );
    const topSellers: string[] = (data.top_selling_products || [])
      .slice(0, 3)
      .map((p: any) => p.productName || 'Unknown');
    const criticalCount = (data.critical_low_stock || []).length;
    const expiryCount = (data.batches_expiring_soon || []).length;
    const stockAnomalyCount = (data.stock_anomalies || []).length;
    const opAnomaly = data.operational_anomalies || {};

    const sessionDiscrepancyCount = (opAnomaly.session_discrepancies || []).length;
    const refundPatternCount = (opAnomaly.refund_patterns || []).length;
    const timingAnomalyCount = (opAnomaly.pre_closing_activity || []).length;

    // 1. Executive Summary
    insights.push({
      type: 'report_summary',
      summary: 'Business Summary for This Period',
      metadata: {
        executive_summary:
          `Total sales for this period ${totalRevenue > 0 ? `is $ ${totalRevenue.toLocaleString('en-US')}` : 'is not yet available'}. ` +
          `${criticalCount > 0 ? `There are ${criticalCount} products with critical stock that need immediate restocking. ` : 'There are no products with critical stock at this time. '}` +
          `${expiryCount > 0 ? `${expiryCount} product batches will expire within the next 30 days. ` : ''}` +
          `${stockAnomalyCount > 0 ? `Found ${stockAnomalyCount} suspicious stock movements. ` : ''}` +
          `${sessionDiscrepancyCount > 0 ? `CRITICAL: ${sessionDiscrepancyCount} cash discrepancies detected in recent closures! ` : ''}` +
          `${refundPatternCount > 0 ? `WARNING: Found ${refundPatternCount} suspicious cashier refund patterns.` : ''}`,
        highlights: [
          ...(topSellers.length > 0 ? [`Top selling products: ${topSellers.join(', ')}`] : []),
          ...(criticalCount > 0 ? [`${criticalCount} products with critical stock`] : []),
          ...(expiryCount > 0 ? [`${expiryCount} batches nearing expiration`] : []),
          ...(stockAnomalyCount > 0 ? [`${stockAnomalyCount} stock movement anomalies`] : []),
          ...(sessionDiscrepancyCount > 0 ? [`${sessionDiscrepancyCount} cash discrepancies detected`] : []),
          ...(refundPatternCount > 0 ? [`${refundPatternCount} suspicious refund patterns`] : []),
        ],
        total_revenue: totalRevenue > 0 ? totalRevenue : null,
        top_concern:
          sessionDiscrepancyCount > 0
            ? `Immediate Audit Required: ${sessionDiscrepancyCount} cash discrepancies`
            : criticalCount > 0
              ? `Critical stock for ${criticalCount} products`
              : 'No critical issues at this time',
      },
    });

    // 2. Best Sellers
    for (const p of (data.top_selling_products || []).slice(0, 5)) {
      const variantSuffix = p.variantName !== p.productName ? ` (${p.variantName})` : '';
      const isStockLow =
        parseFloat(p.currentStock) > 0 && parseFloat(p.currentStock) <= parseFloat(p.minStock || 10);
      insights.push({
        type: 'best_seller',
        summary: `${p.productName}${variantSuffix} — ${p.totalUnitsSold} units sold`,
        metadata: {
          product_name: p.productName,
          sku: p.sku || '-',
          units_sold: parseInt(p.totalUnitsSold || 0),
          revenue: parseFloat(p.totalRevenue || 0),
          current_stock: parseInt(p.currentStock || 0),
          stock_warning: isStockLow,
        },
      });
    }

    // 3. Low Stock Alerts + Restock Suggestions
    for (const s of data.critical_low_stock || []) {
      const variantSuffix = s.variantName !== s.productName ? ` (${s.variantName})` : '';
      const isCritical = parseInt(s.currentStock) === 0;
      insights.push({
        type: 'low_stock_alert',
        summary: `${s.productName}${variantSuffix} — Stock ${isCritical ? 'Out' : 'Critical'}: ${s.currentStock} remaining`,
        metadata: {
          product_name: s.productName,
          sku: s.sku || '-',
          current_stock: parseInt(s.currentStock || 0),
          min_stock: parseInt(s.minStock || 0),
          severity: isCritical ? 'critical' : 'warning',
        },
      });
      insights.push({
        type: 'stock_suggestion',
        summary: `Restock ${s.productName}${variantSuffix} — Priority ${isCritical ? 'High' : 'Medium'}`,
        metadata: {
          product_name: s.productName,
          sku: s.sku || '-',
          current_stock: parseInt(s.currentStock || 0),
          recommended_quantity: Math.max(parseInt(s.minStock || 10) * 3, 20),
          priority: isCritical ? 'high' : 'medium',
        },
      });
    }

    // 4. Slow Moving Products
    for (const p of (data.slow_moving_products || []).slice(0, 5)) {
      const variantSuffix = p.variantName !== p.productName ? ` (${p.variantName})` : '';
      const daysRemaining =
        parseInt(p.totalUnitsSold || 1) > 0
          ? Math.round((parseInt(p.currentStock || 0) / parseInt(p.totalUnitsSold || 1)) * 30)
          : null;
      insights.push({
        type: 'slow_moving',
        summary: `${p.productName}${variantSuffix} — Only ${p.totalUnitsSold} units sold, stock ${p.currentStock}`,
        metadata: {
          product_name: p.productName,
          sku: p.sku || '-',
          units_sold_in_period: parseInt(p.totalUnitsSold || 0),
          current_stock: parseInt(p.currentStock || 0),
          days_of_stock_remaining: daysRemaining,
        },
      });
      insights.push({
        type: 'promo_suggestion',
        summary: `Promote ${p.productName}${variantSuffix} — Excess stock`,
        metadata: {
          product_name: p.productName,
          sku: p.sku || '-',
          reason: 'slow_moving',
          current_stock: parseInt(p.currentStock || 0),
          recommended_discount_pct: 15,
          promo_type: 'PERCENT_DISCOUNT',
          urgency: 'medium',
        },
      });
    }

    // 5. Dead Stock
    for (const p of (data.dead_stock_products || []).slice(0, 3)) {
      const variantSuffix = p.variantName !== p.productName ? ` (${p.variantName})` : '';
      insights.push({
        type: 'slow_moving',
        summary: `${p.productName}${variantSuffix} — No sales in this period (stock: ${p.currentStock})`,
        metadata: {
          product_name: p.productName,
          sku: p.sku || '-',
          units_sold_in_period: 0,
          current_stock: parseInt(p.currentStock || 0),
          days_of_stock_remaining: null,
        },
      });
    }

    // 6. Expiry Alerts
    for (const b of data.batches_expiring_soon || []) {
      const variantSuffix = b.variantName !== b.productName ? ` (${b.variantName})` : '';
      const today = new Date();
      const expiryDate = new Date(b.expiryDate);
      const daysLeft = Math.round((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const severity = daysLeft <= 7 ? 'critical' : daysLeft <= 14 ? 'warning' : 'info';
      insights.push({
        type: 'expiry_alert',
        summary: `${b.productName}${variantSuffix} — Batch ${b.batchNumber || '-'} expires in ${daysLeft} days`,
        metadata: {
          product_name: b.productName,
          batch_number: b.batchNumber || '-',
          qty_at_risk: parseInt(b.currentQuantity || 0),
          expiry_date: b.expiryDate,
          days_until_expiry: daysLeft,
          severity,
        },
      });
      if (parseInt(b.currentQuantity || 0) > 0) {
        insights.push({
          type: 'promo_suggestion',
          summary: `Flash Sale ${b.productName}${variantSuffix} — Batch expires in ${daysLeft} days`,
          metadata: {
            product_name: b.productName,
            sku: b.sku || '-',
            reason: 'near_expiry',
            current_stock: parseInt(b.currentQuantity || 0),
            recommended_discount_pct: daysLeft <= 7 ? 40 : daysLeft <= 14 ? 25 : 15,
            promo_type: 'PERCENT_DISCOUNT',
            urgency: severity,
          },
        });
      }
    }

    // 7. Stock Anomalies
    for (const m of (data.stock_anomalies || []).slice(0, 5)) {
      const variantSuffix = m.variantName !== m.productName ? ` (${m.variantName})` : '';
      insights.push({
        type: 'anomaly_alert',
        summary: `Stock Anomaly: ${m.productName}${variantSuffix} — ${m.referenceType}`,
        metadata: {
          product_name: m.productName,
          sku: m.sku || '-',
          movement_type: m.referenceType,
          qty_lost: Math.abs(parseInt(m.qty || 0)),
          date: m.date,
          reason: m.reason || null,
          severity: Math.abs(parseInt(m.qty || 0)) > 20 ? 'critical' : 'warning',
          risk_level: Math.abs(parseInt(m.qty || 0)) > 20 ? 'high' : 'medium',
          audit_hint: 'Verify stock adjustment logs and reason.',
          message: m.reason
            ? `Stock reduction (${m.referenceType}): ${m.reason}`
            : `Stock reduction ${m.referenceType} without description — needs investigation`,
        },
      });
    }

    // 8. Operational Anomaly: Cash Discrepancies
    for (const s of opAnomaly.session_discrepancies || []) {
      insights.push({
        type: 'anomaly_alert',
        summary: `Cash Discrepancy — Session #${s.sessionId} (${s.cashierName})`,
        metadata: {
          sessionId: s.sessionId,
          cashierName: s.cashierName,
          diff: parseFloat(s.difference),
          expected: parseFloat(s.expectedAmount),
          actual: parseFloat(s.actualAmount),
          closedAt: s.closedAt,
          severity: Math.abs(parseFloat(s.difference)) > 100 ? 'critical' : 'warning',
          risk_level: Math.abs(parseFloat(s.difference)) > 100 ? 'high' : 'medium',
          audit_hint: `Audit session closure report and verify cash handovers for ${s.cashierName}.`,
        },
      });
    }

    // 9. Operational Anomaly: Refund Spikes
    for (const r of opAnomaly.refund_patterns || []) {
      const isHighRisk = parseInt(r.totalRefunds) > 10;
      insights.push({
        type: 'anomaly_alert',
        summary: `Refund Pattern Detected — ${r.cashierName}`,
        metadata: {
          cashierName: r.cashierName,
          totalRefunds: parseInt(r.totalRefunds),
          totalAmount: parseFloat(r.totalRefundAmount),
          severity: isHighRisk ? 'critical' : 'warning',
          risk_level: isHighRisk ? 'high' : 'medium',
          audit_hint: `Check CCTV for cashier ${r.cashierName} and verify refund receipts for high-value items.`,
        },
      });
    }

    // 10. Operational Anomaly: Discount Deviations
    for (const d of opAnomaly.discount_analysis || []) {
      if (d.discountPercentage > 15) { // 15% threshold for rule-based
        insights.push({
          type: 'anomaly_alert',
          summary: `High Discount Usage — ${d.cashierName} (${d.discountPercentage.toFixed(1)}%)`,
          metadata: {
            cashierName: d.cashierName,
            discountPct: d.discountPercentage,
            totalSales: parseFloat(d.totalSales),
            totalDiscounts: parseFloat(d.totalDiscounts),
            severity: d.discountPercentage > 25 ? 'critical' : 'warning',
            risk_level: d.discountPercentage > 25 ? 'high' : 'medium',
            audit_hint: `Review cashier's manual discount permissions and specific transaction promos.`,
          },
        });
      }
    }

    // 11. Operational Anomaly: Timing (Pre-close spikes)
    for (const t of opAnomaly.pre_closing_activity || []) {
      insights.push({
        type: 'anomaly_alert',
        summary: `Suspicious Closing Activity — Session #${t.sessionId}`,
        metadata: {
          sessionId: t.sessionId,
          cashierName: t.cashierName,
          orderCount: parseInt(t.lastMinuteOrders),
          severity: 'warning',
          risk_level: 'medium',
          audit_hint: `Check CCTV for last-minute orders before closing at session #${t.sessionId}.`,
        },
      });
    }

    // 12. Overstock Candidates
    for (const p of (data.overstock_candidates || []).slice(0, 3)) {
      const variantSuffix = p.variantName !== p.productName ? ` (${p.variantName})` : '';
      insights.push({
        type: 'promo_suggestion',
        summary: `${p.productName}${variantSuffix} — Overstock: ${p.currentStock} units, low sales`,
        metadata: {
          product_name: p.productName,
          sku: p.sku || '-',
          reason: 'overstock',
          current_stock: parseInt(p.currentStock || 0),
          recommended_discount_pct: 20,
          promo_type: 'PERCENT_DISCOUNT',
          urgency: 'medium',
        },
      });
    }

    return insights;
  }

  private async saveInsights(insights: any[], branchId: string) {
    const hashids = new Hashids(process.env.ID_SECRET, 10);
    const timestamp = Date.now();

    const entities = insights.map((insight, index) => {
      const entity = new AiInsight();
      entity.branch = { id: branchId } as any;
      entity.type = this.mapToInsightType(insight.type);
      entity.summary = insight.summary;
      entity.metadata = insight.metadata;
      entity.id = hashids.encode(timestamp + index);
      return entity;
    });

    await this.aiInsightRepository.save(entities);
  }
}
