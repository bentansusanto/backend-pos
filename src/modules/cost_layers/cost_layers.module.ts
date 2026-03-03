import { Module } from '@nestjs/common';
import { CostLayersService } from './cost_layers.service';
import { CostLayersController } from './cost_layers.controller';

@Module({
  controllers: [CostLayersController],
  providers: [CostLayersService],
})
export class CostLayersModule {}
