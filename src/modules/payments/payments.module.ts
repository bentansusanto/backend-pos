import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingModule } from '../accounting/accounting.module';
import { Order } from '../orders/entities/order.entity';
import { OrdersModule } from '../orders/orders.module';
import { PosSessionsModule } from '../pos-sessions/pos-sessions.module';
import { ProductStock } from '../product-stocks/entities/product-stock.entity';
import { EventsModule } from '../events/events.module';
import { SalesReportsModule } from '../sales-reports/sales-reports.module';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';
import { Payment } from './entities/payment.entity';
import { Refund } from './entities/refund.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { LoyaltySettingsModule } from '../loyalty-settings/loyalty-settings.module';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService],
  imports: [
    TypeOrmModule.forFeature([Payment, Refund, StockMovement, ProductStock, Order]),
    forwardRef(() => OrdersModule),
    PosSessionsModule,
    SalesReportsModule,
    ConfigModule,
    AccountingModule,
    EventsModule,
    LoyaltySettingsModule,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
