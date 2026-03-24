import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { PurchaseItems } from './entities/purchase-items.entity';
import { Purchase } from './entities/purchase.entity';

@Injectable()
export class PurchasesService {
  constructor(
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
    @InjectRepository(PurchaseItems)
    private readonly purchaseItemsRepository: Repository<PurchaseItems>,
  ) {}

  async create(createPurchaseDto: CreatePurchaseDto) {
    // 1. Calculate total from items
    const total = createPurchaseDto.items.reduce(
      (acc, item) => acc + item.quantity * item.price,
      0,
    );
    const change_amount = createPurchaseDto.paid_amount - total;

    // 2. Create the Purchase record
    const purchase = this.purchaseRepository.create({
      supplier_id: createPurchaseDto.supplier_id,
      branch: { id: createPurchaseDto.branch_id },
      total,
      paid_amount: createPurchaseDto.paid_amount,
      change_amount,
      payment_method: createPurchaseDto.payment_method,
      note: createPurchaseDto.note || '',
    });

    const savedPurchase = await this.purchaseRepository.save(purchase);

    // 3. Create items
    if (createPurchaseDto.items && createPurchaseDto.items.length > 0) {
      const items = createPurchaseDto.items.map((i) => {
        return this.purchaseItemsRepository.create({
          purchase: { id: savedPurchase.id },
          product_id: i.product_id,
          quantity: i.quantity,
          price: i.price,
          total: i.quantity * i.price,
        });
      });
      await this.purchaseItemsRepository.save(items);
    }


    return savedPurchase;
  }

  async findAll() {
    const results = await this.purchaseRepository.find({
      relations: ['branch', 'purchaseItems'],
      order: { createdAt: 'DESC' },
    });

    return results;
  }

  async findOne(id: string) {
    const purchase = await this.purchaseRepository.findOne({
      where: { id },
      relations: ['branch', 'purchaseItems'],
    });

    if (!purchase) {
      throw new NotFoundException(`Purchase with ID ${id} not found`);
    }

    return purchase;
  }

  async update(id: string, updatePurchaseDto: UpdatePurchaseDto) {
    const purchase = await this.findOne(id);
    let newTotal = purchase.total;

    if (updatePurchaseDto.items && updatePurchaseDto.items.length > 0) {
      newTotal = updatePurchaseDto.items.reduce(
        (acc, item) => acc + item.quantity * item.price,
        0,
      );

      // wipe existing items
      await this.purchaseItemsRepository.delete({ purchase: { id } });

      // recreate them
      const newItems = updatePurchaseDto.items.map((i) => {
        return this.purchaseItemsRepository.create({
          purchase: { id },
          product_id: i.product_id,
          quantity: i.quantity,
          price: i.price,
          total: i.quantity * i.price,
        });
      });
      await this.purchaseItemsRepository.save(newItems);
    } else if (updatePurchaseDto.items && updatePurchaseDto.items.length === 0) {
      // If client deliberately clears items, delete all
      await this.purchaseItemsRepository.delete({ purchase: { id } });
      newTotal = 0;
    }

    const { items, branch_id, ...rest } = updatePurchaseDto;

    await this.purchaseRepository.update(id, {
      ...rest,
      total: newTotal,
      branch: branch_id ? { id: branch_id } : purchase.branch,
    });

    return this.findOne(id);
  }

  async updateStatus(id: string, status: string) {
    await this.purchaseRepository.update(id, { status });
    return this.findOne(id);
  }

  async remove(id: string) {
    const purchase = await this.findOne(id);
    // Because of relationships without CASCADE, manual deletion of items may be required or TypeORM handles it if mapped correctly.
    await this.purchaseItemsRepository.delete({ purchase: { id } });
    await this.purchaseRepository.delete(id);


    return { success: true };
  }
}
