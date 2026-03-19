import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockMovement } from './entities/stock-movement.entity';
import { StockMovementsController } from './stock-movements.controller';
import { StockMovementsService } from './stock-movements.service';
import { UserLogsModule } from '../user_logs/user_logs.module';

@Module({
  imports: [TypeOrmModule.forFeature([StockMovement]), UserLogsModule],
  controllers: [StockMovementsController],
  providers: [StockMovementsService],
  exports: [StockMovementsService],
})
export class StockMovementsModule {}
