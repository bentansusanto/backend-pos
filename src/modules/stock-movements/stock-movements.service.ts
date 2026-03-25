import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { errStockMovementMessage } from 'src/libs/errors/error_stock_movement';
import { successStockMovementMessage } from 'src/libs/success/success_stock_movement';
import { StockMovementResponse } from 'src/types/response/stock-movement.type';
import { Repository } from 'typeorm';
import { ActionType, EntityType } from '../user_logs/entities/user_log.entity';
import { UserLogsService } from '../user_logs/user_logs.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { UpdateStockMovementDto } from './dto/update-stock-movement.dto';
import { StockMovement } from './entities/stock-movement.entity';

@Injectable()
export class StockMovementsService {
  constructor(
    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,
    private readonly userLogsService: UserLogsService,
  ) {}

  async create(
    createStockMovementDto: CreateStockMovementDto,
    userId?: string,
  ): Promise<StockMovementResponse> {
    const { productId, variantId, branchId, ...rest } = createStockMovementDto;

    const stockMovement = this.stockMovementRepository.create({
      ...rest,
      productVariant: variantId ? { id: variantId } : undefined,
      branch: { id: branchId },
    });

    await this.stockMovementRepository.save(stockMovement);

    this.userLogsService.log({
      userId: userId ?? '',
      action: ActionType.CREATE,
      entityType: EntityType.STOCK_MOVEMENT,
      entityId: stockMovement.id,
      description: `Created stock movement: ${stockMovement.referenceType} (qty: ${stockMovement.qty})`,
      metadata: {
        referenceType: stockMovement.referenceType,
        qty: stockMovement.qty,
        referenceId: stockMovement.referenceId,
      },
    });

    return {
      message: successStockMovementMessage.SUCCESS_CREATE_STOCK_MOVEMENT,
      data: {
        id: stockMovement.id,
        variantId: variantId,
        productName: '',
        variantName: '',
        sku: '',
        branchId: branchId,
        referenceType: stockMovement.referenceType,
        qty: stockMovement.qty,
        referenceId: stockMovement.referenceId,
        reason: stockMovement.reason,
        createdAt: stockMovement.createdAt,
        updatedAt: stockMovement.updatedAt,
      },
    };
  }

  async findAll(branchId?: string): Promise<StockMovementResponse> {
    const stockMovements = await this.stockMovementRepository.find({
      where: branchId ? { branch: { id: branchId } } : undefined,
      relations: ['productVariant', 'productVariant.product', 'branch'],
      order: { createdAt: 'DESC' },
    });

    if (stockMovements.length === 0) {
      throw new NotFoundException({
        message: errStockMovementMessage.ERROR_FIND_ALL_STOCK_MOVEMENT,
        data: null,
      });
    }

    return {
      message: successStockMovementMessage.SUCCESS_FIND_ALL_STOCK_MOVEMENT,
      datas: stockMovements.map((sm) => ({
        id: sm.id,
        variantId: sm.productVariant?.id,
        productName: sm.productVariant?.product?.name_product,
        variantName: sm.productVariant?.name_variant,
        sku: sm.productVariant?.sku,
        branchId: sm.branch?.id,
        referenceType: sm.referenceType,
        qty: sm.qty,
        referenceId: sm.referenceId,
        reason: sm.reason,
        createdAt: sm.createdAt,
        updatedAt: sm.updatedAt,
      })),
    };
  }

  async findOne(id: string): Promise<StockMovementResponse> {
    const sm = await this.stockMovementRepository.findOne({
      where: { id },
      relations: ['productVariant', 'productVariant.product', 'branch'],
    });

    if (!sm) {
      throw new NotFoundException({
        message: errStockMovementMessage.ERROR_FIND_STOCK_MOVEMENT,
        data: null,
      });
    }

    return {
      message: successStockMovementMessage.SUCCESS_FIND_STOCK_MOVEMENT,
      data: {
        id: sm.id,
        variantId: sm.productVariant?.id,
        productName: sm.productVariant?.product?.name_product,
        variantName: sm.productVariant?.name_variant,
        sku: sm.productVariant?.sku,
        branchId: sm.branch?.id,
        referenceType: sm.referenceType,
        qty: sm.qty,
        referenceId: sm.referenceId,
        reason: sm.reason,
        createdAt: sm.createdAt,
        updatedAt: sm.updatedAt,
      },
    };
  }

  async update(
    id: string,
    updateStockMovementDto: UpdateStockMovementDto,
    userId?: string,
  ): Promise<StockMovementResponse> {
    await this.findOne(id);

    await this.stockMovementRepository.update(id, updateStockMovementDto);

    this.userLogsService.log({
      userId: userId ?? '',
      action: ActionType.UPDATE,
      entityType: EntityType.STOCK_MOVEMENT,
      entityId: id,
      description: `Updated stock movement: ${id}`,
      metadata: { updates: updateStockMovementDto },
    });

    const updated = await this.findOne(id);

    return {
      message: successStockMovementMessage.SUCCESS_UPDATE_STOCK_MOVEMENT,
      data: updated.data,
    };
  }

  async remove(id: string, userId?: string): Promise<StockMovementResponse> {
    await this.findOne(id);

    await this.stockMovementRepository.delete(id);

    this.userLogsService.log({
      userId: userId ?? '',
      action: ActionType.DELETE,
      entityType: EntityType.STOCK_MOVEMENT,
      entityId: id,
      description: `Deleted stock movement: ${id}`,
    });

    return {
      message: successStockMovementMessage.SUCCESS_DELETE_STOCK_MOVEMENT,
    };
  }
}
