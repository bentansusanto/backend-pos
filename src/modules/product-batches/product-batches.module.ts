import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductBatchesService } from './product-batches.service';
import { ProductBatchesController } from './product-batches.controller';
import { ProductBatch } from './entities/product-batch.entity';
import { Branch } from '../branches/entities/branch.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Supplier } from '../supplier/entities/supplier.entity';
import { PurchaseReceiving } from '../purchase_receivings/entities/purchase_receiving.entity';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductBatch,
      Branch,
      ProductVariant,
      Supplier,
      PurchaseReceiving,
      // StockMovement is required for recording FEFO deductions, disposals, and movement history
      StockMovement,
    ]),
  ],
  controllers: [ProductBatchesController],
  providers: [ProductBatchesService],
  exports: [ProductBatchesService],
})
export class ProductBatchesModule {}
