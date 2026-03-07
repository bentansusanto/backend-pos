import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Hashids from 'hashids';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { AiJob, AiJobStatus } from '../ai-jobs/entities/ai-job.entity';
import { Order } from '../orders/entities/order.entity';
import { ProductStock } from '../product-stocks/entities/product-stock.entity';
import { AiInsight, InsightType } from './entities/ai-insight.entity';

@Injectable()
export class AiInsightService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(AiInsight)
    private readonly aiInsightRepository: Repository<AiInsight>,
    @InjectRepository(AiJob)
    private readonly aiJobRepository: Repository<AiJob>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(ProductStock)
    private readonly productStockRepository: Repository<ProductStock>,
    private readonly configService: ConfigService,
  ) {}

  async findAll(branchId: string) {
    try {
      return await this.aiInsightRepository.find({
        where: { branch: { id: branchId } },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error('Error finding all ai insights', error);
      throw error;
    }
  }

  async findOne(id: string) {
    try {
      const insight = await this.aiInsightRepository.findOne({ where: { id } });
      if (!insight) {
        throw new HttpException('Insight not found', HttpStatus.NOT_FOUND);
      }
      return insight;
    } catch (error) {
      this.logger.error(`Error finding insight with id ${id}`, error);
      throw error;
    }
  }

  async generateInsights(branchId: string, timeRange: string = 'monthly') {
    this.logger.debug(
      `Generating insights for branch ${branchId} with range ${timeRange}...`,
    );

    // Create and save job
    const job = new AiJob();
    job.branch = { id: branchId } as any;
    job.status = AiJobStatus.PENDING;
    job.payload = [`Generate Insights (${timeRange})`];
    job.generateId();
    await this.aiJobRepository.save(job);

    try {
      job.status = AiJobStatus.PROCESSING;
      await this.aiJobRepository.save(job);

      // 1. Gather Data
      const salesData = await this.getSalesData(branchId, timeRange);
      const stockData = await this.getStockData(branchId);

      const promptData = {
        [`sales_summary_${timeRange}`]: salesData.dailySales,
        top_selling_products: salesData.topProducts,
        low_stock_items: stockData.lowStock,
        overstock_candidates: stockData.highStock, // potential overstock based on high quantity
        time_range: timeRange,
      };

      // 2. Call AI Service
      const aiResponse = await this.callOpenAI(promptData);

      // 3. Save Insights
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

      this.logger.error(`Error generating insights: ${error.message}`, error);
      throw error;
    }
  }

  private mapToInsightType(type: string): InsightType {
    // Normalize string: lowercase, replace spaces with underscores
    const normalized = type.toLowerCase().replace(/\s+/g, '_');

    const validTypes = Object.values(InsightType);
    if (validTypes.includes(normalized as InsightType)) {
      return normalized as InsightType;
    }

    // Fallback mapping for common AI hallucinations
    if (normalized.includes('overstock')) return InsightType.STOCK_SUGGESTION;
    if (normalized.includes('restock')) return InsightType.STOCK_SUGGESTION;
    if (normalized.includes('sales')) return InsightType.SALES_TREND;
    if (normalized.includes('best')) return InsightType.BEST_SELLER;
    if (normalized.includes('slow')) return InsightType.SLOW_MOVING;
    if (normalized.includes('low')) return InsightType.LOW_STOCK_ALERT;
    if (normalized.includes('expiry')) return InsightType.EXPIRY_ALERT;
    if (normalized.includes('anomaly')) return InsightType.ANOMALY_ALERT;
    if (normalized.includes('promo')) return InsightType.PROMO_SUGGESTION;

    // Default fallback
    return InsightType.REPORT_SUMMARY;
  }

  private async getSalesData(branchId: string, timeRange: string = 'monthly') {
    const startDate = new Date();

    switch (timeRange) {
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'yearly':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'monthly':
      default:
        startDate.setDate(startDate.getDate() - 30);
        break;
    }

    // Daily Sales Trend
    const dailySales = await this.orderRepository
      .createQueryBuilder('order')
      .select("TO_CHAR(order.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('SUM(order.subtotal)', 'totalSales')
      .where('order.branch_id = :branchId', { branchId })
      .andWhere('order.createdAt >= :startDate', { startDate })
      .groupBy("TO_CHAR(order.createdAt, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany();

    // Top Selling Products
    const topProducts = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.items', 'item')
      .leftJoin('item.variant', 'variant')
      .leftJoin('variant.product', 'product')
      .select('product.name_product', 'productName')
      .addSelect('SUM(item.quantity)', 'totalQuantity')
      .addSelect('SUM(item.subtotal)', 'totalRevenue')
      .where('order.branch_id = :branchId', { branchId })
      .andWhere('order.createdAt >= :startDate', { startDate })
      .groupBy('product.name_product')
      .orderBy('"totalQuantity"', 'DESC')
      .limit(10)
      .getRawMany();

    return { dailySales, topProducts };
  }

  private async getStockData(branchId: string) {
    // Critical Stock (stock <= minStock) using QueryBuilder
    const criticalStock = await this.productStockRepository
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.productVariant', 'productVariant')
      .leftJoinAndSelect('productVariant.product', 'product')
      .where('stock.branch_id = :branchId', { branchId })
      .andWhere('stock.stock <= stock.minStock')
      .limit(20)
      .getMany();

    // High Stock (just top 20 by quantity for now as "potential overstock")
    const highStock = await this.productStockRepository.find({
      where: { branch: { id: branchId } },
      relations: ['productVariant', 'productVariant.product'],
      order: { stock: 'DESC' },
      take: 20,
    });

    return {
      lowStock: criticalStock.map((s) => ({
        product: s.productVariant?.product?.name_product || 'Unknown Product',
        stock: s.stock,
        min: s.minStock,
      })),
      highStock: highStock.map((s) => ({
        product: s.productVariant?.product?.name_product || 'Unknown Product',
        stock: s.stock,
      })),
    };
  }

  private async callOpenAI(data: any) {
    const apiKey = this.configService.get('AI_API_KEY');
    if (!apiKey || apiKey === 'your_ai_api_key_here') {
      this.logger.warn('AI_API_KEY is not set. Returning mock data.');
      return this.getMockInsights();
    }

    const apiUrl =
      this.configService.get('AI_API_URL') ||
      'https://api.openai.com/v1/chat/completions';
    const model = this.configService.get('AI_MODEL') || 'gpt-4-turbo';

    const prompt = `
      You are an AI Business Analyst for a Retail POS system.
      Analyze the following sales and stock data for a store branch and provide actionable insights.

      Data:
      ${JSON.stringify(data)}

      Requirements:
      1. Identify sales trends (up/down).
      2. Identify fast-moving and slow-moving items.
      3. Recommend restocks for low stock items.
      4. Identify potential overstock (items with high stock but low sales).
      5. Detect any anomalies.
      6. Recommend promotions for: products with high stock but low sales (overstock), slow-moving items, and products nearing expiry date (if available). Each promo suggestion should include a recommended discount percentage or promo type to boost sales and reduce potential losses.

      Output Format: JSON Array of objects.
      Each object must have:
      - type: One of ['sales_trend', 'stock_suggestion', 'best_seller', 'slow_moving', 'low_stock_alert', 'anomaly_alert', 'promo_suggestion', 'report_summary']
      - summary: Short title/summary.
      - metadata: A structured object (not string) containing details.

      Specific Metadata Structures:
      - For 'stock_suggestion': { "product_name": string, "current_stock": number, "recommended_quantity": number, "priority": "high"|"medium"|"low" }
      - For 'low_stock_alert', 'anomaly_alert': { "severity": "critical"|"warning"|"info", "message": string, "type": "critical"|"warning"|"info" }
      - For 'sales_trend': { "trend": "up"|"down"|"stable", "percentage": number, "details": string }
      - For 'best_seller', 'slow_moving': { "product_name": string, "quantity_sold": number, "revenue": number }
      - For 'promo_suggestion': { "product_name": string, "reason": "overstock"|"slow_moving"|"near_expiry", "recommended_discount_pct": number, "promo_type": string, "urgency": "high"|"medium"|"low" }
      - For 'report_summary': { "executive_summary": string, "highlights": string[] }

      Important: For stock suggestions and alerts, generate ONE entry per product/alert so they can be listed individually.
    `;

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
            {
              role: 'system',
              content:
                'You are a helpful AI business analyst that outputs JSON only.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API Error: ${response.statusText}`);
      }

      const result = await response.json();
      const content = result.choices[0].message.content;

      // Clean up markdown code blocks if present
      const jsonString = content
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      return JSON.parse(jsonString);
    } catch (error) {
      this.logger.error('Failed to call AI API', error);
      return this.getMockInsights(); // Fallback
    }
  }

  private async saveInsights(insights: any[], branchId: string) {
    // Clear old insights for this branch (optional, or keep history)
    // For MVP, let's keep history but maybe we want to show only latest?
    // Let's just add new ones.

    const hashids = new Hashids(process.env.ID_SECRET, 10);
    const timestamp = Date.now();

    const entities = insights.map((insight, index) => {
      const entity = new AiInsight();
      entity.branch = { id: branchId } as any;
      entity.type = this.mapToInsightType(insight.type);
      entity.summary = insight.summary;
      entity.metadata = insight.metadata;
      // Ensure unique ID for batch processing by adding index offset
      // This prevents duplicate key errors when Date.now() is identical for all items
      entity.id = hashids.encode(timestamp + index);
      return entity;
    });

    await this.aiInsightRepository.save(entities);
  }

  private getMockInsights() {
    return [
      {
        type: 'report_summary',
        summary: 'Weekly Business Overview',
        metadata: {
          executive_summary:
            'Sales have shown a positive trend this week with a 15% increase compared to last week.',
          highlights: [
            'Sales up 15%',
            'New best seller identified',
            'Stock levels stable',
          ],
        },
      },
      {
        type: 'sales_trend',
        summary: 'Sales have increased by 15% this week.',
        metadata: {
          trend: 'up',
          percentage: 15,
          details: 'Total sales: $5000, Previous week: $4300',
        },
      },
      {
        type: 'stock_suggestion',
        summary: 'Restock Coffee Beans',
        metadata: {
          product_name: 'Coffee Beans (1kg)',
          current_stock: 5,
          recommended_quantity: 20,
          priority: 'high',
        },
      },
      {
        type: 'stock_suggestion',
        summary: 'Restock Milk',
        metadata: {
          product_name: 'Fresh Milk (1L)',
          current_stock: 2,
          recommended_quantity: 50,
          priority: 'medium',
        },
      },
      {
        type: 'low_stock_alert',
        summary: 'Critical Low Stock',
        metadata: {
          severity: 'critical',
          message: 'Coffee Beans inventory is critically low.',
          type: 'critical',
        },
      },
      {
        type: 'promo_suggestion',
        summary: 'Flash Sale for Slow-Moving Stock',
        metadata: {
          product_name: 'Instant Noodles (Bulk Pack)',
          reason: 'slow_moving',
          recommended_discount_pct: 20,
          promo_type: 'Flash Sale',
          urgency: 'medium',
        },
      },
    ];
  }
}
