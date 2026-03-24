import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductStocksService } from '../product-stocks/product-stocks.service';
import { PurchasesService } from '../purchases/purchases.service';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { ReferenceType } from '../stock-movements/entities/stock-movement.entity';
import { CreatePurchaseReceivingDto } from './dto/create-purchase_receiving.dto';
import { UpdatePurchaseReceivingDto } from './dto/update-purchase_receiving.dto';
import { PurchaseReceiving } from './entities/purchase_receiving.entity';
import { PurchaseReceivingItem } from './entities/purchase_receiving_item.entity';

@Injectable()
export class PurchaseReceivingsService {
  constructor(
    @InjectRepository(PurchaseReceiving)
    private readonly purchaseReceivingRepo: Repository<PurchaseReceiving>,
    @InjectRepository(PurchaseReceivingItem)
    private readonly purchaseReceivingItemRepo: Repository<PurchaseReceivingItem>,
    private readonly productStocksService: ProductStocksService,
    private readonly purchasesService: PurchasesService,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  async create(createDto: CreatePurchaseReceivingDto, userId?: string) {
    // 1. Create the receiving parent record
    const receiving = this.purchaseReceivingRepo.create({
      purchase: { id: createDto.purchase_id },
      supplier: { id: createDto.supplier_id },
      branch: { id: createDto.branch_id },
      note: createDto.note || '',
    });

    const savedReceiving = await this.purchaseReceivingRepo.save(receiving);

    // 2. Loop through items, save them, and trigger stock adjustments natively
    if (createDto.items && createDto.items.length > 0) {
      for (const itemDto of createDto.items) {
        // Save the receiving item
        const receivingItem = this.purchaseReceivingItemRepo.create({
          purchaseReceiving: { id: savedReceiving.id },
          productVariant: { id: itemDto.product_variant_id },
          qty: itemDto.qty,
          cost: itemDto.cost,
        });
        await this.purchaseReceivingItemRepo.save(receivingItem);

        // NATIVELY ADD INVENTORY: Check if product stock row exists for this variant + branch
        try {
          // The `create` method natively handles upserts (adding to existing stock if the row exists)
          await this.productStocksService.create(
            {
              productId: '', // service auto-fetches if variantId is sent
              variantId: itemDto.product_variant_id,
              branchId: createDto.branch_id,
              stock: itemDto.qty,
              minStock: 0,
            },
            userId,
          );
        } catch (error) {
          console.error(
            `Failed to automatically allocate stock for receiving variant ${itemDto.product_variant_id}`,
            error,
          );
        }

        // NATIVELY LOG STOCK MOVEMENT
        try {
          await this.stockMovementsService.create(
            {
              variantId: itemDto.product_variant_id,
              branchId: createDto.branch_id,
              referenceType: ReferenceType.PURCHASE,
              referenceId: savedReceiving.id,
              qty: itemDto.qty,
              reason: `Dari Penerimaan Barang: ${savedReceiving.id}`,
            },
            userId,
          );
        } catch (error) {
          console.error(
            `Failed to log stock movement for receiving ${savedReceiving.id}`,
            error,
          );
        }
      }
    }

    // 3. Evaluate and update Purchase Order status (PARTIAL vs COMPLETED)
    try {
      const allReceivings = await this.purchaseReceivingRepo.find({
        where: { purchase: { id: createDto.purchase_id } },
        relations: ['items'],
      });

      const totalReceived = allReceivings.reduce(
        (sum, r) => sum + r.items.reduce((acc, item) => acc + item.qty, 0),
        0,
      );

      const purchase = await this.purchasesService.findOne(
        createDto.purchase_id,
      );
      const totalOrdered = purchase.purchaseItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );

      const newStatus = totalReceived >= totalOrdered ? 'COMPLETED' : 'PARTIAL';
      await this.purchasesService.updateStatus(
        createDto.purchase_id,
        newStatus,
      );
    } catch (e) {
      console.error(
        `Failed to evaluate Purchase Order ${createDto.purchase_id} status`,
        e,
      );
    }

    return savedReceiving;
  }

  async findAll() {
    return this.purchaseReceivingRepo.find({
      relations: [
        'purchase',
        'supplier',
        'branch',
        'items',
        'items.productVariant',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const receiving = await this.purchaseReceivingRepo.findOne({
      where: { id },
      relations: [
        'purchase',
        'supplier',
        'branch',
        'items',
        'items.productVariant',
      ],
    });

    if (!receiving) {
      throw new NotFoundException(`PurchaseReceiving with ID ${id} not found`);
    }
    return receiving;
  }

  async update(
    id: string,
    updatePurchaseReceivingDto: UpdatePurchaseReceivingDto,
  ) {
    // Editing an already received shipment generally isn't ideal without correcting stock levels
    throw new Error(
      'Editing a completed receiving log is not fully supported yet in UI. Please create a new adjustment.',
    );
  }

  async remove(id: string) {
    const receiving = await this.findOne(id);
    await this.purchaseReceivingItemRepo.delete({ purchaseReceiving: { id } });
    return this.purchaseReceivingRepo.delete(id);
  }
}
