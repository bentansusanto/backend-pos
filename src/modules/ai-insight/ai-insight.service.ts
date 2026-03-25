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

  async generateInsights(branchId: string, timeRange: string = 'monthly') {

    const job = new AiJob();
    job.branch = { id: branchId } as any;
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
      const anomalyData = await this.getAnomalyData(branchId, timeRange);
      const expiryData = await this.getExpiryData(branchId);

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
        stock_anomalies: anomalyData.suspiciousMovements,
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

    // Daily revenue trend
    const dailySales = await this.orderRepository
      .createQueryBuilder('order')
      .select("TO_CHAR(order.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('SUM(order.subtotal)', 'totalRevenue')
      .addSelect('COUNT(order.id)', 'totalOrders')
      .where('order.branch_id = :branchId', { branchId })
      .andWhere('order.createdAt >= :startDate', { startDate })
      .andWhere("order.status = 'completed'")
      .groupBy("TO_CHAR(order.createdAt, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany();

    // Top-selling products with current stock context
    const topProducts = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.items', 'item')
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
      .where('order.branch_id = :branchId', { branchId })
      .andWhere('order.createdAt >= :startDate', { startDate })
      .andWhere("order.status = 'completed'")
      .groupBy('product.name_product')
      .addGroupBy('variant.name_variant')
      .addGroupBy('variant.sku')
      .orderBy('"totalUnitsSold"', 'DESC')
      .limit(10)
      .getRawMany();

    // Slow-moving: products with very low sales but significant stock
    const slowMovingProducts = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.items', 'item')
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
      .where('order.branch_id = :branchId', { branchId })
      .andWhere('order.createdAt >= :startDate', { startDate })
      .andWhere("order.status = 'completed'")
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
- "summary": short specific human-readable title using actual product names from the data
- "metadata": structured object specific to the type

RULES:
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
    const anomalyCount = (data.stock_anomalies || []).length;

    // 1. Executive Summary
    insights.push({
      type: 'report_summary',
      summary: 'Business Summary for This Period',
      metadata: {
        executive_summary:
          `Total revenue for this period ${totalRevenue > 0 ? `is $ ${totalRevenue.toLocaleString('en-US')}` : 'is not yet available'}. ` +
          `${criticalCount > 0 ? `There are ${criticalCount} products with critical stock that need immediate restocking. ` : 'There are no products with critical stock at this time. '}` +
          `${expiryCount > 0 ? `${expiryCount} product batches will expire within the next 30 days. ` : ''}` +
          `${anomalyCount > 0 ? `Found ${anomalyCount} suspicious stock movements that require attention.` : ''}`,
        highlights: [
          ...(topSellers.length > 0 ? [`Top selling products: ${topSellers.join(', ')}`] : []),
          ...(criticalCount > 0 ? [`${criticalCount} products with critical stock`] : []),
          ...(expiryCount > 0 ? [`${expiryCount} batches nearing expiration`] : []),
          ...(anomalyCount > 0 ? [`${anomalyCount} stock movement anomalies`] : []),
        ],
        total_revenue: totalRevenue > 0 ? totalRevenue : null,
        top_concern:
          criticalCount > 0
            ? `Critical stock for ${criticalCount} products`
            : expiryCount > 0
              ? `${expiryCount} batches nearing expiration`
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
        summary: `${m.productName}${variantSuffix} — ${m.referenceType}: ${Math.abs(m.qty)} units reduced (${m.date})`,
        metadata: {
          product_name: m.productName,
          sku: m.sku || '-',
          movement_type: m.referenceType,
          qty_lost: Math.abs(parseInt(m.qty || 0)),
          date: m.date,
          reason: m.reason || null,
          severity: Math.abs(parseInt(m.qty || 0)) > 20 ? 'critical' : 'warning',
          message: m.reason
            ? `Stock reduction (${m.referenceType}): ${m.reason}`
            : `Stock reduction ${m.referenceType} without description — needs investigation`,
        },
      });
    }

    // 8. Overstock Candidates
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
