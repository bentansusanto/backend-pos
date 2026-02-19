import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiJob } from '../ai-jobs/entities/ai-job.entity';
import { Order } from '../orders/entities/order.entity';
import { ProductStock } from '../product-stocks/entities/product-stock.entity';
import { Product } from '../products/entities/product.entity';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';
import { AiInsightController } from './ai-insight.controller';
import { AiInsightService } from './ai-insight.service';
import { AiInsight } from './entities/ai-insight.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiInsight,
      AiJob,
      Order,
      Product,
      ProductStock,
      StockMovement,
    ]),
  ],
  controllers: [AiInsightController],
  providers: [AiInsightService],
  exports: [AiInsightService],
})
export class AiInsightModule {}
