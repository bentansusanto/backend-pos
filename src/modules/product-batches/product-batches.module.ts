import { Module } from '@nestjs/common';
import { ProductBatchesService } from './product-batches.service';
import { ProductBatchesController } from './product-batches.controller';

@Module({
  controllers: [ProductBatchesController],
  providers: [ProductBatchesService],
})
export class ProductBatchesModule {}
