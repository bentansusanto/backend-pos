import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockTake } from './entities/stock-take.entity';
import { StockTakeItem } from './entities/stock-take-item.entity';
import { StockTakesService } from './stock-takes.service';
import { StockTakesController } from './stock-takes.controller';
import { ProductStocksModule } from '../product-stocks/product-stocks.module';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';
import { ProductVariantsModule } from '../products/product-variants/product-variants.module';
import { BranchesModule } from '../branches/branches.module';
import { ProductStock } from '../product-stocks/entities/product-stock.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([StockTake, StockTakeItem, ProductStock]),
    ProductStocksModule,
    StockMovementsModule,
    ProductVariantsModule,
    BranchesModule,
  ],
  controllers: [StockTakesController],
  providers: [StockTakesService],
  exports: [StockTakesService],
})
export class StockTakesModule {}
