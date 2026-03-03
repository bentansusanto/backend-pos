import { Injectable } from '@nestjs/common';
import { CreatePurchaseReceivingDto } from './dto/create-purchase_receiving.dto';
import { UpdatePurchaseReceivingDto } from './dto/update-purchase_receiving.dto';

@Injectable()
export class PurchaseReceivingsService {
  create(createPurchaseReceivingDto: CreatePurchaseReceivingDto) {
    return 'This action adds a new purchaseReceiving';
  }

  findAll() {
    return `This action returns all purchaseReceivings`;
  }

  findOne(id: number) {
    return `This action returns a #${id} purchaseReceiving`;
  }

  update(id: number, updatePurchaseReceivingDto: UpdatePurchaseReceivingDto) {
    return `This action updates a #${id} purchaseReceiving`;
  }

  remove(id: number) {
    return `This action removes a #${id} purchaseReceiving`;
  }
}
