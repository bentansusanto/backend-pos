import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
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
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { UserLogsService } from '../user_logs/user_logs.service';
import { StockTakeResponse } from 'src/types/response/stock-take.type';
import { successStockTakeMessage } from 'src/libs/success/success_stock_take';
import { errStockTakeMessage } from 'src/libs/errors/error_stock_take';
import { ActionType, EntityType } from '../user_logs/entities/user_log.entity';

@Injectable()
export class StockTakesService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(StockTake)
    private readonly stockTakeRepository: Repository<StockTake>,
    @InjectRepository(StockTakeItem)
    private readonly stockTakeItemRepository: Repository<StockTakeItem>,
    @InjectRepository(ProductStock)
    private readonly productStockRepository: Repository<ProductStock>,
    private readonly stockMovementsService: StockMovementsService,
    private readonly dataSource: DataSource,
    private readonly eventsGateway: EventsGateway,
    private readonly userLogsService: UserLogsService,
  ) {}

  async create(
    createStockTakeDto: CreateStockTakeDto,
    userId: string,
  ): Promise<StockTakeResponse> {
    try {
      const stockTake = this.stockTakeRepository.create({
        branch: { id: createStockTakeDto.branch_id },
        user: { id: userId },
        notes: createStockTakeDto.notes,
        status: StockTakeStatus.DRAFT,
        isFrozen: createStockTakeDto.isFrozen || false,
      });
      const saved = await this.stockTakeRepository.save(stockTake);

      this.userLogsService.log({
        userId: userId,
        action: ActionType.CREATE,
        entityType: EntityType.STOCK_TAKE,
        entityId: saved.id,
        description: `Created stock take session: ${saved.id}`,
      });

      this.eventsGateway.broadcastStockTakeUpdate({
        id: saved.id,
        status: saved.status,
      });

      return {
        message: successStockTakeMessage.SUCCESS_CREATE_STOCK_TAKE,
        data: {
          id: saved.id,
          branchId: createStockTakeDto.branch_id,
          userId: userId,
          status: saved.status,
          notes: saved.notes,
          isFrozen: saved.isFrozen,
          createdAt: saved.createdAt,
          updatedAt: saved.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errStockTakeMessage.ERROR_CREATE_STOCK_TAKE, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errStockTakeMessage.ERROR_CREATE_STOCK_TAKE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(branchId?: string): Promise<StockTakeResponse> {
    try {
      const stockTakes = await this.stockTakeRepository.find({
        where: branchId ? { branch: { id: branchId } } : undefined,
        relations: ['branch', 'user', 'approvedBy'],
        order: { createdAt: 'DESC' },
      });

      if (stockTakes.length === 0) {
        throw new NotFoundException({
          message: errStockTakeMessage.ERROR_FIND_ALL_STOCK_TAKE,
          data: null,
        });
      }

      return {
        message: successStockTakeMessage.SUCCESS_FIND_ALL_STOCK_TAKE,
        datas: stockTakes.map((st) => ({
          id: st.id,
          branchId: st.branch?.id,
          userId: st.user?.id,
          status: st.status,
          notes: st.notes,
          isFrozen: st.isFrozen,
          approvedById: st.approvedBy?.id,
          approvedAt: st.approvedAt,
          completedAt: st.completedAt,
          createdAt: st.createdAt,
          updatedAt: st.updatedAt,
        })),
      };
    } catch (error) {
      this.logger.error(errStockTakeMessage.ERROR_FIND_ALL_STOCK_TAKE, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errStockTakeMessage.ERROR_FIND_ALL_STOCK_TAKE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: string): Promise<StockTakeResponse> {
    try {
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
        throw new NotFoundException({
          message: errStockTakeMessage.ERROR_FIND_STOCK_TAKE,
          data: null,
        });
      }

      return {
        message: successStockTakeMessage.SUCCESS_FIND_STOCK_TAKE,
        data: {
          id: stockTake.id,
          branchId: stockTake.branch?.id,
          userId: stockTake.user?.id,
          status: stockTake.status,
          notes: stockTake.notes,
          isFrozen: stockTake.isFrozen,
          approvedById: stockTake.approvedBy?.id,
          approvedAt: stockTake.approvedAt,
          completedAt: stockTake.completedAt,
          createdAt: stockTake.createdAt,
          updatedAt: stockTake.updatedAt,
          items: stockTake.items?.map((item) => ({
            id: item.id,
            variantId: item.productVariant?.id,
            productName: item.productVariant?.product?.name_product,
            variantName: item.productVariant?.name_variant,
            sku: item.productVariant?.sku,
            systemQty: item.systemQty,
            countedQty: item.countedQty,
            difference: item.difference,
            reason: item.reason,
          })),
        },
      };
    } catch (error) {
      this.logger.error(errStockTakeMessage.ERROR_FIND_STOCK_TAKE, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errStockTakeMessage.ERROR_FIND_STOCK_TAKE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async submit(
    id: string,
    submitStockTakeDto: SubmitStockTakeDto,
    userId?: string,
  ): Promise<StockTakeResponse> {
    try {
      const findResult = await this.findOne(id);
      const stockTakeData = findResult.data;

      if (stockTakeData.status !== StockTakeStatus.DRAFT) {
        throw new BadRequestException('Only DRAFT sessions can be submitted');
      }

      // Step 1: Delete existing items directly via repository
      await this.stockTakeItemRepository.delete({ stockTake: { id } });

      // Step 2: Build and save items directly via stockTakeItemRepository
      for (const itemDto of submitStockTakeDto.items) {
        const productStock = await this.productStockRepository.findOne({
          where: {
            branch: { id: stockTakeData.branchId },
            productVariant: { id: itemDto.variant_id },
          },
        });

        const systemQty = productStock ? productStock.stock : 0;
        const countedQty = itemDto.countedQty;
        const difference = countedQty - systemQty;

        const stockTakeItem = this.stockTakeItemRepository.create({
          stockTakeId: id,
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
        notes: submitStockTakeDto.notes || stockTakeData.notes,
      });

      this.userLogsService.log({
        userId: userId ?? '',
        action: ActionType.UPDATE,
        entityType: EntityType.STOCK_TAKE,
        entityId: id,
        description: `Submitted stock take session: ${id}`,
      });

      this.eventsGateway.broadcastStockTakeUpdate({
        id,
        status: StockTakeStatus.PENDING_APPROVAL,
      });

      return await this.findOne(id);
    } catch (error) {
      this.logger.error(errStockTakeMessage.ERROR_SUBMIT_STOCK_TAKE, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errStockTakeMessage.ERROR_SUBMIT_STOCK_TAKE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async approve(id: string, userId: string): Promise<StockTakeResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const stockTake = await this.stockTakeRepository.findOne({
        where: { id },
        relations: [
          'branch',
          'items',
          'items.productVariant',
          'items.productVariant.product',
        ],
      });

      if (!stockTake) {
        throw new NotFoundException(`StockTake with ID ${id} not found`);
      }

      if (stockTake.status !== StockTakeStatus.PENDING_APPROVAL) {
        throw new BadRequestException(
          'Only PENDING_APPROVAL sessions can be approved',
        );
      }

      if (!stockTake.items || stockTake.items.length === 0) {
        throw new BadRequestException(
          'Cannot approve a stock take with no items. Please submit the counted items first.',
        );
      }

      for (const item of stockTake.items) {
        let productStock = await this.productStockRepository.findOne({
          where: {
            branch: { id: stockTake.branch.id },
            productVariant: { id: item.productVariant.id },
          },
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
          await this.stockMovementsService.create(
            {
              productId: item.productVariant.product.id,
              variantId: item.productVariant.id,
              branchId: stockTake.branch.id,
              referenceType: ReferenceType.STOCK_TAKE,
              qty: item.difference,
              referenceId: stockTake.id,
              reason: item.reason,
            },
            userId,
          );
        }
      }

      stockTake.status = StockTakeStatus.COMPLETED;
      stockTake.completedAt = new Date();
      stockTake.approvedAt = new Date();
      stockTake.approvedBy = { id: userId } as any;
      stockTake.isFrozen = false;
      await queryRunner.manager.save(stockTake);

      await queryRunner.commitTransaction();

      this.userLogsService.log({
        userId: userId,
        action: ActionType.APPROVE,
        entityType: EntityType.STOCK_TAKE,
        entityId: id,
        description: `Approved stock take session: ${id}`,
      });

      this.eventsGateway.broadcastStockTakeUpdate({
        id,
        status: stockTake.status,
      });

      // Broadcast real-time stock updates
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
      this.logger.error(errStockTakeMessage.ERROR_APPROVE_STOCK_TAKE, err.stack);
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        errStockTakeMessage.ERROR_APPROVE_STOCK_TAKE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async reject(id: string, userId?: string): Promise<StockTakeResponse> {
    try {
      const stockTake = await this.stockTakeRepository.findOne({
        where: { id },
        relations: ['branch', 'user'],
      });

      if (!stockTake) {
        throw new NotFoundException(`StockTake with ID ${id} not found`);
      }

      if (stockTake.status !== StockTakeStatus.PENDING_APPROVAL) {
        throw new BadRequestException(
          'Only PENDING_APPROVAL sessions can be rejected',
        );
      }

      stockTake.status = StockTakeStatus.REJECTED;
      stockTake.isFrozen = false;
      const saved = await this.stockTakeRepository.save(stockTake);

      this.userLogsService.log({
        userId: userId ?? '',
        action: ActionType.REJECT,
        entityType: EntityType.STOCK_TAKE,
        entityId: id,
        description: `Rejected stock take session: ${id}`,
      });

      this.eventsGateway.broadcastStockTakeUpdate({ id, status: saved.status });

      return {
        message: successStockTakeMessage.SUCCESS_REJECT_STOCK_TAKE,
        data: {
          id: saved.id,
          branchId: saved.branch?.id,
          userId: saved.user?.id,
          status: saved.status,
          notes: saved.notes,
          isFrozen: saved.isFrozen,
          createdAt: saved.createdAt,
          updatedAt: saved.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errStockTakeMessage.ERROR_REJECT_STOCK_TAKE, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errStockTakeMessage.ERROR_REJECT_STOCK_TAKE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async isBranchFrozen(branchId: string): Promise<any> {
    try {
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
    } catch (error) {
      this.logger.error(errStockTakeMessage.ERROR_CHECK_FROZEN, error.stack);
      throw new HttpException(
        errStockTakeMessage.ERROR_CHECK_FROZEN,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
