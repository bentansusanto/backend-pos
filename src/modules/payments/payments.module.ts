import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrdersModule } from '../orders/orders.module';
import { ProductStock } from '../product-stocks/entities/product-stock.entity';
import { SalesReportsModule } from '../sales-reports/sales-reports.module';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';
import { Payment } from './entities/payment.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService],
  imports: [
    TypeOrmModule.forFeature([Payment, StockMovement, ProductStock, Order]),
    OrdersModule,
    SalesReportsModule,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
