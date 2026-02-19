import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { AiJob, AiJobStatus } from '../ai-jobs/entities/ai-job.entity';
import { Order } from '../orders/entities/order.entity';
import { ProductStock } from '../product-stocks/entities/product-stock.entity';
import { AiInsight, InsightType } from './entities/ai-insight.entity';

@Injectable()
export class AiInsightService {
  private readonly logger = new Logger(AiInsightService.name);

  constructor(
    @InjectRepository(AiInsight)
    private aiInsightRepository: Repository<AiInsight>,
    @InjectRepository(AiJob)
    private aiJobRepository: Repository<AiJob>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(ProductStock)
    private productStockRepository: Repository<ProductStock>,
    private configService: ConfigService,
  ) {}

  async findAll(branchId: string) {
    return this.aiInsightRepository.find({
      where: { branch: { id: branchId } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    return this.aiInsightRepository.findOne({ where: { id } });
  }

  async generateInsights(branchId: string) {
    this.logger.log(`Generating insights for branch ${branchId}...`);

    // Create and save job
    const job = new AiJob();
    job.branch = { id: branchId } as any;
    job.status = AiJobStatus.PENDING;
    job.payload = ['Generate Insights'];
    job.generateId();
    await this.aiJobRepository.save(job);

    try {
      job.status = AiJobStatus.PROCESSING;
      await this.aiJobRepository.save(job);

      // 1. Gather Data
      const salesData = await this.getSalesData(branchId);
      const stockData = await this.getStockData(branchId);

      const promptData = {
        sales_summary_30_days: salesData.dailySales,
        top_selling_products: salesData.topProducts,
        low_stock_items: stockData.lowStock,
        overstock_candidates: stockData.highStock, // potential overstock based on high quantity
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

      this.logger.error(
        `Error generating insights: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async getSalesData(branchId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Daily Sales Trend
    const dailySales = await this.orderRepository
      .createQueryBuilder('order')
      .select("TO_CHAR(order.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('SUM(order.subtotal)', 'totalSales')
      .where('order.branch_id = :branchId', { branchId })
      .andWhere('order.createdAt >= :startDate', { startDate: thirtyDaysAgo })
      .groupBy("TO_CHAR(order.createdAt, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany();

    // Top Selling Products
    const topProducts = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.items', 'item')
      .select('item.product_name', 'productName')
      .addSelect('SUM(item.quantity)', 'totalQuantity')
      .addSelect('SUM(item.subtotal)', 'totalRevenue')
      .where('order.branch_id = :branchId', { branchId })
      .andWhere('order.createdAt >= :startDate', { startDate: thirtyDaysAgo })
      .groupBy('item.product_name')
      .orderBy('"totalQuantity"', 'DESC')
      .limit(10)
      .getRawMany();

    return { dailySales, topProducts };
  }

  private async getStockData(branchId: string) {
    // Low Stock (stock <= minStock)
    const lowStock = await this.productStockRepository.find({
      where: {
        branch: { id: branchId },
        stock: LessThan(10), // Fallback if minStock is 0, or use Raw query for stock <= minStock
      },
      relations: ['product'],
      take: 20,
    });

    // For more accurate "stock <= minStock", we can filter in JS or use QueryBuilder
    // Let's refine this to use QueryBuilder for stock <= minStock comparison
    const criticalStock = await this.productStockRepository
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.product', 'product')
      .where('stock.branch_id = :branchId', { branchId })
      .andWhere('stock.stock <= stock.minStock')
      .limit(20)
      .getMany();

    // High Stock (just top 20 by quantity for now as "potential overstock")
    const highStock = await this.productStockRepository.find({
      where: { branch: { id: branchId } },
      relations: ['product'],
      order: { stock: 'DESC' },
      take: 20,
    });

    return {
      lowStock: criticalStock.map((s) => ({
        product: s.product.name_product,
        stock: s.stock,
        min: s.minStock,
      })),
      highStock: highStock.map((s) => ({
        product: s.product.name_product,
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
      4. Identify potential overstock (items with high stock but low sales - cross-reference if possible, or just flag high stock).
      5. Detect any anomalies (e.g., zero sales on a usually busy day, or sudden spikes).

      Output Format: JSON Array of objects with keys:
      - type: One of ['sales_trend', 'stock_suggestion', 'best_seller', 'slow_moving', 'low_stock_alert', 'anomaly_alert']
      - summary: Short title/summary.
      - metadata: Array of strings with details.
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

    const entities = insights.map((insight) => {
      const entity = new AiInsight();
      entity.branch = { id: branchId } as any;
      entity.type = insight.type as InsightType;
      entity.summary = insight.summary;
      entity.metadata = insight.metadata;
      entity.generateId(); // Ensure ID is generated
      return entity;
    });

    await this.aiInsightRepository.save(entities);
  }

  private getMockInsights() {
    return [
      {
        type: 'sales_trend',
        summary: 'Sales have increased by 15% this week.',
        metadata: ['Total sales: $5000', 'Previous week: $4300'],
      },
      {
        type: 'low_stock_alert',
        summary: 'Critical stock levels for 3 items.',
        metadata: ['Coffee Beans (2kg)', 'Milk (5L)', 'Sugar (1kg)'],
      },
    ];
  }
}
