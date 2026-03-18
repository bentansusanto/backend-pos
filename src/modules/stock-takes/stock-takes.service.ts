import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import Hashids from 'hashids';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StockTake, StockTakeStatus } from './entities/stock-take.entity';
import { StockTakeItem } from './entities/stock-take-item.entity';
import { CreateStockTakeDto } from './dto/create-stock-take.dto';
import { SubmitStockTakeDto } from './dto/submit-stock-take.dto';
import { ProductStock } from '../product-stocks/entities/product-stock.entity';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { ReferenceType } from '../stock-movements/entities/stock-movement.entity';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class StockTakesService {
  constructor(
    @InjectRepository(StockTake)
    private readonly stockTakeRepository: Repository<StockTake>,
    @InjectRepository(StockTakeItem)
    private readonly stockTakeItemRepository: Repository<StockTakeItem>,
    @InjectRepository(ProductStock)
    private readonly productStockRepository: Repository<ProductStock>,
    private readonly stockMovementsService: StockMovementsService,
    private readonly dataSource: DataSource,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async create(createStockTakeDto: CreateStockTakeDto, userId: string) {
    const stockTake = this.stockTakeRepository.create({
      branch: { id: createStockTakeDto.branch_id },
      user: { id: userId },
      notes: createStockTakeDto.notes,
      status: StockTakeStatus.DRAFT,
      isFrozen: createStockTakeDto.isFrozen || false,
    });
    const saved = await this.stockTakeRepository.save(stockTake);
    this.eventsGateway.broadcastStockTakeUpdate({ id: saved.id, status: saved.status });
    return {
      message: 'Stock take session created successfully',
      data: saved,
    };
  }

  async findAll(branchId?: string) {
    const stockTakes = await this.stockTakeRepository.find({
      where: branchId ? { branch: { id: branchId } } : undefined,
      relations: ['branch', 'user', 'approvedBy'],
      order: { createdAt: 'DESC' },
    });
    return {
      message: 'Successfully retrieved all stock take sessions',
      datas: stockTakes,
    };
  }

  async findOne(id: string) {
    const stockTake = await this.stockTakeRepository.findOne({
      where: { id },
      relations: [
        'branch',
        'user',
        'approvedBy',
        'items',
        'items.productVariant',
        'items.productVariant.product',
      ],
    });
    if (!stockTake) {
      throw new NotFoundException(`StockTake with ID ${id} not found`);
    }
    return {
      message: 'Successfully retrieved stock take session',
      data: stockTake,
    };
  }

  async submit(id: string, submitStockTakeDto: SubmitStockTakeDto) {
    const findResult = await this.findOne(id);
    const stockTake = findResult.data;

    if (stockTake.status !== StockTakeStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT sessions can be submitted');
    }

    // Step 1: Delete existing items directly via repository (no queryRunner ambiguity)
    await this.stockTakeItemRepository.delete({ stockTake: { id } });

    // Step 2: Build and save items directly via stockTakeItemRepository
    for (const itemDto of submitStockTakeDto.items) {
      const productStock = await this.productStockRepository.findOne({
        where: {
          branch: { id: stockTake.branch.id },
          productVariant: { id: itemDto.variant_id },
        },
      });

      const systemQty = productStock ? productStock.stock : 0;
      const countedQty = itemDto.countedQty;
      const difference = countedQty - systemQty;

      const stockTakeItem = this.stockTakeItemRepository.create({
        stockTakeId: id,   // Explicitly set the FK
        stockTake: stockTake,
        productVariant: { id: itemDto.variant_id },
        systemQty,
        countedQty,
        difference,
        reason: itemDto.reason,
      });
      await this.stockTakeItemRepository.save(stockTakeItem);
    }

    // Step 3: Update status to PENDING_APPROVAL
    await this.stockTakeRepository.update(id, {
      status: StockTakeStatus.PENDING_APPROVAL,
      notes: submitStockTakeDto.notes || stockTake.notes,
    });

    this.eventsGateway.broadcastStockTakeUpdate({ id, status: stockTake.status });
    return await this.findOne(id);
  }

  async approve(id: string, userId: string) {
    const findResult = await this.findOne(id);
    const stockTake = findResult.data;

    if (stockTake.status !== StockTakeStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Only PENDING_APPROVAL sessions can be approved');
    }

    if (!stockTake.items || stockTake.items.length === 0) {
      throw new BadRequestException(
        'Cannot approve a stock take with no items. Please submit the counted items first.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of stockTake.items) {
        let productStock = await this.productStockRepository.findOne({
          where: {
            branch: { id: stockTake.branch.id },
            productVariant: { id: item.productVariant.id },
          },
          relations: ['productVariant', 'productVariant.product'],
        });

        if (productStock) {
          await queryRunner.manager.update(ProductStock, productStock.id, {
            stock: item.countedQty,
          });
        } else {
          productStock = this.productStockRepository.create({
            branch: { id: stockTake.branch.id },
            productVariant: { id: item.productVariant.id },
            stock: item.countedQty,
          });
          await queryRunner.manager.save(productStock);
        }

        if (item.difference !== 0) {
          await this.stockMovementsService.create({
            productId: item.productVariant.product.id,
            variantId: item.productVariant.id,
            branchId: stockTake.branch.id,
            referenceType: ReferenceType.STOCK_TAKE,
            qty: item.difference,
            referenceId: stockTake.id,
          });
        }
      }

      stockTake.status = StockTakeStatus.COMPLETED;
      stockTake.completedAt = new Date();
      stockTake.approvedAt = new Date();
      stockTake.approvedBy = { id: userId } as any;
      stockTake.isFrozen = false;
      await queryRunner.manager.save(stockTake);

      await queryRunner.commitTransaction();
      
      this.eventsGateway.broadcastStockTakeUpdate({ id, status: stockTake.status });

      // Broadcast real-time stock updates for all items in the stock take
      if (stockTake.items && stockTake.items.length > 0) {
        for (const item of stockTake.items) {
          this.eventsGateway.broadcastStockUpdate({
            variantId: item.productVariant.id,
            branchId: stockTake.branch.id,
            newStock: item.countedQty,
          });
        }
      }

      return await this.findOne(id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async reject(id: string) {
    const findResult = await this.findOne(id);
    const stockTake = findResult.data;

    if (stockTake.status !== StockTakeStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Only PENDING_APPROVAL sessions can be rejected');
    }

    stockTake.status = StockTakeStatus.REJECTED;
    stockTake.isFrozen = false;
    const saved = await this.stockTakeRepository.save(stockTake);
    
    this.eventsGateway.broadcastStockTakeUpdate({ id, status: saved.status });
    return {
      message: 'Stock take session rejected successfully',
      data: saved,
    };
  }

  async isBranchFrozen(branchId: string) {
    const activeFrozenSession = await this.stockTakeRepository.findOne({
      where: [
        {
          branch: { id: branchId },
          isFrozen: true,
          status: StockTakeStatus.DRAFT,
        },
        {
          branch: { id: branchId },
          isFrozen: true,
          status: StockTakeStatus.PENDING_APPROVAL,
        },
      ],
      relations: ['user'],
    });

    return {
      isFrozen: !!activeFrozenSession,
      session: activeFrozenSession,
    };
  }
}
