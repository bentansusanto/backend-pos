import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { SalesReportsController } from './sales-reports.controller';
import { SalesReportsService } from './sales-reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Order])],
  controllers: [SalesReportsController],
  providers: [SalesReportsService],
  exports: [SalesReportsService],
})
export class SalesReportsModule {}
