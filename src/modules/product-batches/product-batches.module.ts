import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchesModule } from '../branches/branches.module';
import { ProductVariantsModule } from '../products/product-variants/product-variants.module';
import { ProductBatch } from './entities/product-batch.entity';
import { ProductBatchesController } from './product-batches.controller';
import { ProductBatchesService } from './product-batches.service';

@Module({
  controllers: [ProductBatchesController],
  providers: [ProductBatchesService],
  imports: [
    TypeOrmModule.forFeature([ProductBatch]),
    ProductVariantsModule,
    BranchesModule,
  ],
  exports: [ProductBatchesService],
})
export class ProductBatchesModule {}
