import { Module } from '@nestjs/common';
import { ProductBatchesService } from './product-batches.service';
import { ProductBatchesController } from './product-batches.controller';
import { ProductBatch } from './entities/product-batch.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  controllers: [ProductBatchesController],
  providers: [ProductBatchesService],
  imports: [TypeOrmModule.forFeature([ProductBatch])],
  exports: [ProductBatchesService],
})
export class ProductBatchesModule {}
