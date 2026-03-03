import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserLogsModule } from '../user_logs/user_logs.module';
import { DiscountsController } from './discounts.controller';
import { DiscountsService } from './discounts.service';
import { Discount } from './entities/discount.entity';

@Module({
  controllers: [DiscountsController],
  providers: [DiscountsService],
  exports: [DiscountsService],
  imports: [TypeOrmModule.forFeature([Discount]), UserLogsModule],
})
export class DiscountsModule {}
