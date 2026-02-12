import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchesModule } from '../branches/branches.module';
import { ProductVariantsModule } from '../products/product-variants/product-variants.module';
import { ProductStock } from './entities/product-stock.entity';
import { ProductStocksController } from './product-stocks.controller';
import { ProductStocksService } from './product-stocks.service';

@Module({
  controllers: [ProductStocksController],
  providers: [ProductStocksService],
  imports: [
    TypeOrmModule.forFeature([ProductStock]),
    BranchesModule,
    ProductVariantsModule,
  ],
  exports: [ProductStocksService],
})
export class ProductStocksModule {}
