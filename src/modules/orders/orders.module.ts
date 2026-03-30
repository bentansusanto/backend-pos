import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { PosSessionsModule } from '../pos-sessions/pos-sessions.module';
import { ProductStock } from '../product-stocks/entities/product-stock.entity';
import { StockTake } from '../stock-takes/entities/stock-take.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Product } from '../products/entities/product.entity';
import { Tax } from '../tax/entities/tax.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { Refund } from '../payments/entities/refund.entity';
import { UserLogsModule } from '../user_logs/user_logs.module';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
// Import ProductBatchesModule to enable FEFO batch deduction in OrdersService
import { ProductBatchesModule } from '../product-batches/product-batches.module';
import { PaymentsModule } from '../payments/payments.module';
import { ReasonCategoriesModule } from '../reason-categories/reason-categories.module';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      ProductVariant,
      Product,
      ProductStock,
      Customer,
      Tax,
      StockTake,
      Promotion,
      Refund,
    ]),
    forwardRef(() => PaymentsModule),
    UserLogsModule,
    PosSessionsModule,
    ProductBatchesModule,
    ReasonCategoriesModule,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
