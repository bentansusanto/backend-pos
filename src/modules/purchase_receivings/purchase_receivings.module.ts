import { Module } from '@nestjs/common';
import { PurchaseReceivingsService } from './purchase_receivings.service';
import { PurchaseReceivingsController } from './purchase_receivings.controller';

@Module({
  controllers: [PurchaseReceivingsController],
  providers: [PurchaseReceivingsService],
})
export class PurchaseReceivingsModule {}
