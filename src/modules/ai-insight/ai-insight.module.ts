import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiJob } from '../ai-jobs/entities/ai-job.entity';
import { Order } from '../orders/entities/order.entity';
import { ProductStock } from '../product-stocks/entities/product-stock.entity';
import { Product } from '../products/entities/product.entity';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';
import { ProductBatch } from '../product-batches/entities/product-batch.entity';
import { AiInsightController } from './ai-insight.controller';
import { AiInsightService } from './ai-insight.service';
import { AiInsightSchedulerService } from './ai-insight-scheduler.service';
import { AiInsight } from './entities/ai-insight.entity';
import { Branch } from '../branches/entities/branch.entity';
import { PosSession } from '../pos-sessions/entities/pos-session.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Refund } from '../payments/entities/refund.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiInsight,
      AiJob,
      Order,
      Product,
      ProductStock,
      StockMovement,
      ProductBatch,
      Branch,
      PosSession,
      Payment,
      Refund,
    ]),
  ],
  controllers: [AiInsightController],
  providers: [AiInsightService, AiInsightSchedulerService],
  exports: [AiInsightService, AiInsightSchedulerService],
})
export class AiInsightModule {}
