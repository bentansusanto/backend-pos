import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductStocksModule } from '../product-stocks/product-stocks.module';
import { PurchasesModule } from '../purchases/purchases.module';
import { PurchaseReceiving } from './entities/purchase_receiving.entity';
import { PurchaseReceivingItem } from './entities/purchase_receiving_item.entity';
import { PurchaseReceivingsController } from './purchase_receivings.controller';
import { PurchaseReceivingsService } from './purchase_receivings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseReceiving, PurchaseReceivingItem]),
    ProductStocksModule,
    PurchasesModule,
  ],
  controllers: [PurchaseReceivingsController],
  providers: [PurchaseReceivingsService],
})
export class PurchaseReceivingsModule {}
