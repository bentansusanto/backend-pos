import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { Discount } from '../discounts/entities/discount.entity';
import { PosSessionsModule } from '../pos-sessions/pos-sessions.module';
import { ProductStock } from '../product-stocks/entities/product-stock.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Product } from '../products/entities/product.entity';
import { Tax } from '../tax/entities/tax.entity';
import { UserLogsModule } from '../user_logs/user_logs.module';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

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
      Discount,
    ]),
    UserLogsModule,
    PosSessionsModule,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
