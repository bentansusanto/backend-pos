import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StockTake, StockTakeStatus } from './entities/stock-take.entity';
import { StockTakeItem } from './entities/stock-take-item.entity';
import { CreateStockTakeDto } from './dto/create-stock-take.dto';
import { SubmitStockTakeDto } from './dto/submit-stock-take.dto';
import { ProductStock } from '../product-stocks/entities/product-stock.entity';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { ReferenceType } from '../stock-movements/entities/stock-movement.entity';

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
    return {
      message: 'Stock take session created successfully',
      data: saved,
    };
  }

  async findAll(branchId?: string) {
    const stockTakes = await this.stockTakeRepository.find({
      where: branchId ? { branch: { id: branchId } } : undefined,
      relations: ['branch', 'user'],
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
      relations: ['branch', 'user', 'items', 'items.productVariant', 'items.productVariant.product'],
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

    if (stockTake.status === StockTakeStatus.COMPLETED) {
      throw new BadRequestException('StockTake is already completed');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const items: StockTakeItem[] = [];
      
      for (const itemDto of submitStockTakeDto.items) {
        // Find current stock
        let productStock = await this.productStockRepository.findOne({
          where: {
            branch: { id: stockTake.branch.id },
            productVariant: { id: itemDto.variant_id },
          },
          relations: ['productVariant', 'productVariant.product'],
        });

        const systemQty = productStock ? productStock.stock : 0;
        const countedQty = itemDto.countedQty;
        const difference = countedQty - systemQty;

        // Update or create product stock
        if (productStock) {
          productStock.stock = countedQty;
          await queryRunner.manager.save(productStock);
        } else {
          productStock = this.productStockRepository.create({
            branch: { id: stockTake.branch.id },
            productVariant: { id: itemDto.variant_id },
            stock: countedQty,
          });
          await queryRunner.manager.save(productStock);
        }

        // Create stock take item
        const stockTakeItem = this.stockTakeItemRepository.create({
          stockTake: { id },
          productVariant: { id: itemDto.variant_id },
          systemQty,
          countedQty,
          difference,
        });
        items.push(await queryRunner.manager.save(stockTakeItem));

        // Create stock movement
        if (difference !== 0) {
          await this.stockMovementsService.create({
            productId: (productStock as any).productVariant?.product?.id,
            variantId: itemDto.variant_id,
            branchId: stockTake.branch.id,
            referenceType: ReferenceType.STOCK_TAKE,
            qty: difference,
            referenceId: stockTake.id,
          });
        }
      }

      stockTake.status = StockTakeStatus.COMPLETED;
      stockTake.completedAt = new Date();
      stockTake.notes = submitStockTakeDto.notes || stockTake.notes;
      stockTake.isFrozen = false; // Auto-unfreeze on completion
      await queryRunner.manager.save(stockTake);

      await queryRunner.commitTransaction();
      return await this.findOne(id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
