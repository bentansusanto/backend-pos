import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { errBranchMessage } from 'src/libs/errors/error_branch';
import { errProductMessage } from 'src/libs/errors/error_product';
import { errProductStockMessage } from 'src/libs/errors/error_product_stock';
import { successProductStockMessage } from 'src/libs/success/success_product_stock';
import { ProductStockResponse } from 'src/types/response/product-stock.type';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { BranchesService } from '../branches/branches.service';
import { ProductVariantsService } from '../products/product-variants/product-variants.service';
import { ReferenceType } from '../stock-movements/entities/stock-movement.entity';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { ActionType, EntityType } from '../user_logs/entities/user_log.entity';
import { UserLogsService } from '../user_logs/user_logs.service';
import { EventsGateway } from '../events/events.gateway';
import {
  CreateProductStockDto,
  UpdateProductStockDto,
} from './dto/create-product-stock.dto';
import { ProductStock } from './entities/product-stock.entity';

@Injectable()
export class ProductStocksService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(ProductStock)
    private readonly productStockRepository: Repository<ProductStock>,
    private readonly productVariantService: ProductVariantsService,
    private readonly branchService: BranchesService,
    private readonly stockMovementsService: StockMovementsService,
    private readonly userLogsService: UserLogsService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // create product stock
  async create(
    createProductStockDto: CreateProductStockDto,
    userId?: string,
  ): Promise<ProductStockResponse> {
    try {
      // check branch exists
      const branch = await this.branchService.findOne(
        createProductStockDto.branchId,
      );

      if (!branch) {
        this.logger.error(errBranchMessage.BRANCH_NOT_FOUND);
        throw new HttpException(
          errBranchMessage.BRANCH_NOT_FOUND,
          HttpStatus.BAD_REQUEST,
        );
      }

      let productVariant;
      let productId = createProductStockDto.productId;

      // if variantId is provided, check if variant exists
      if (createProductStockDto.variantId) {
        productVariant = await this.productVariantService.findOne(
          createProductStockDto.variantId,
        );

        if (!productVariant) {
          this.logger.error(errProductMessage.ERROR_FIND_VARIANT);
          throw new HttpException(
            errProductMessage.ERROR_FIND_VARIANT,
            HttpStatus.BAD_REQUEST,
          );
        }
        productId = productVariant.data.product_id;
      }

      // create product stock (only variant-based now)
      const productStockData: any = {
        ...createProductStockDto,
        branch: {
          id: branch.data.id,
        },
      };

      if (productVariant) {
        productStockData.productVariant = {
          id: productVariant.data.id,
        };
      }

      const productStock = this.productStockRepository.create(productStockData);
      await this.productStockRepository.save(productStock);

      // Create stock movement for adjustment
      await this.stockMovementsService.create({
        productId: productId,
        variantId: productVariant?.data?.id || null,
        branchId: createProductStockDto.branchId,
        referenceType: ReferenceType.ADJUST,
        qty: createProductStockDto.stock,
        referenceId: (productStock as any).id,
      });

      this.logger.debug(
        successProductStockMessage.SUCCESS_CREATE_PRODUCT_STOCK,
        productStock,
      );

      // fire-and-forget log
      this.userLogsService.log({
        userId: userId ?? '',
        action: ActionType.CREATE,
        entityType: EntityType.STOCK_MOVEMENT,
        entityId: (productStock as any).id,
        description: `Stock created for variant ${productVariant?.data?.id ?? 'N/A'} at branch ${branch.data.id} (qty: ${createProductStockDto.stock})`,
        metadata: {
          variantId: productVariant?.data?.id,
          branchId: branch.data.id,
          stock: createProductStockDto.stock,
        },
      });

      // Broadcast real-time update
      this.eventsGateway.broadcastStockUpdate({
        variantId: productVariant?.data?.id,
        branchId: branch.data.id,
        newStock: (productStock as any).stock,
      });

      return {
        message: successProductStockMessage.SUCCESS_CREATE_PRODUCT_STOCK,
        data: {
          id: (productStock as any).id,
          variantId: productVariant?.data?.id || null,
          branchId: branch.data.id,
          stock: (productStock as any).stock,
          minStock: (productStock as any).minStock,
          createdAt: (productStock as any).createdAt,
          updatedAt: (productStock as any).updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(
        errProductStockMessage.ERR_CREATE_PRODUCT_STOCK,
        error.stack,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errProductStockMessage.ERR_CREATE_PRODUCT_STOCK,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // find all product stocks
  async findAll(branchId?: string): Promise<ProductStockResponse> {
    try {
      const productStocks = await this.productStockRepository.find({
        where: branchId ? { branch: { id: branchId } } : undefined,
        relations: ['branch', 'productVariant'],
      });

      if (productStocks.length === 0) {
        this.logger.error(errProductStockMessage.ERR_GET_PRODUCT_STOCKS);
        throw new HttpException(
          errProductStockMessage.ERR_GET_PRODUCT_STOCKS,
          HttpStatus.NOT_FOUND,
        );
      }

      this.logger.debug(
        successProductStockMessage.SUCCESS_GET_PRODUCT_STOCKS,
        productStocks,
      );
      return {
        message: successProductStockMessage.SUCCESS_GET_PRODUCT_STOCKS,
        datas: productStocks.map((productStock) => ({
          id: productStock.id,
          productId: productStock.productVariant?.product?.id,
          variantId: productStock.productVariant.id,
          branchId: productStock.branch.id,
          stock: productStock.stock,
          minStock: productStock.minStock,
          createdAt: productStock.createdAt,
          updatedAt: productStock.updatedAt,
        })),
      };
    } catch (error) {
      this.logger.error(
        errProductStockMessage.ERR_GET_PRODUCT_STOCKS,
        error.stack,
      );
      throw new HttpException(
        errProductStockMessage.ERR_GET_PRODUCT_STOCKS,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // find one product stock
  async findOne(id: string): Promise<ProductStockResponse> {
    try {
      const productStock = await this.productStockRepository.findOne({
        where: {
          id,
        },
        relations: ['branch', 'productVariant'],
      });
      if (!productStock) {
        this.logger.error(errProductStockMessage.ERR_GET_PRODUCT_STOCK);
        throw new HttpException(
          errProductStockMessage.ERR_GET_PRODUCT_STOCK,
          HttpStatus.NOT_FOUND,
        );
      }
      this.logger.debug(
        successProductStockMessage.SUCCESS_GET_PRODUCT_STOCK,
        productStock,
      );
      return {
        message: successProductStockMessage.SUCCESS_GET_PRODUCT_STOCK,
        data: {
          id: productStock.id,
          productId: productStock.productVariant?.product?.id,
          variantId: productStock.productVariant.id,
          branchId: productStock.branch.id,
          stock: productStock.stock,
          minStock: productStock.minStock,
          createdAt: productStock.createdAt,
          updatedAt: productStock.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(
        errProductStockMessage.ERR_GET_PRODUCT_STOCK,
        error.stack,
      );
      throw new HttpException(
        errProductStockMessage.ERR_GET_PRODUCT_STOCK,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // update product stock
  async update(
    id: string,
    updateProductStockDto: UpdateProductStockDto,
    userId?: string,
  ): Promise<ProductStockResponse> {
    try {
      const productStock = await this.productStockRepository.findOne({
        where: {
          id,
        },
        relations: ['branch', 'productVariant'],
      });
      if (!productStock) {
        this.logger.error(errProductStockMessage.ERR_GET_PRODUCT_STOCK);
        throw new HttpException(
          errProductStockMessage.ERR_GET_PRODUCT_STOCK,
          HttpStatus.NOT_FOUND,
        );
      }
      await this.productStockRepository.update(id, {
        stock: updateProductStockDto.stock,
        minStock: updateProductStockDto.minStock,
        updatedAt: new Date(),
      });

      // Create stock movement for adjustment if stock changed
      if (
        updateProductStockDto.stock !== undefined &&
        updateProductStockDto.stock !== productStock.stock
      ) {
        const diff = updateProductStockDto.stock - productStock.stock;
        await this.stockMovementsService.create({
          productId: productStock.productVariant?.product?.id,
          variantId: productStock.productVariant?.id,
          branchId: productStock.branch?.id,
          referenceType: ReferenceType.ADJUST,
          qty: diff,
          referenceId: productStock.id,
        });
      }

      // Broadcast real-time update
      this.eventsGateway.broadcastStockUpdate({
        variantId: productStock.productVariant?.id,
        branchId: productStock.branch?.id,
        newStock: updateProductStockDto.stock,
      });

      this.logger.debug(
        successProductStockMessage.SUCCESS_UPDATE_PRODUCT_STOCK,
        productStock,
      );
      return {
        message: successProductStockMessage.SUCCESS_UPDATE_PRODUCT_STOCK,
        data: {
          id: productStock.id,
          productId: productStock.productVariant?.product?.id,
          variantId: productStock.productVariant.id,
          branchId: productStock.branch.id,
          stock: productStock.stock,
          minStock: productStock.minStock,
          updatedAt: productStock.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(
        errProductStockMessage.ERR_UPDATE_PRODUCT_STOCK,
        error.stack,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errProductStockMessage.ERR_UPDATE_PRODUCT_STOCK,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // delete product stock
  async remove(id: string, userId?: string): Promise<ProductStockResponse> {
    try {
      const productStock = await this.productStockRepository.findOne({
        where: {
          id,
        },
        relations: ['branch', 'productVariant'],
      });
      if (!productStock) {
        this.logger.error(errProductStockMessage.ERR_GET_PRODUCT_STOCK);
        throw new HttpException(
          errProductStockMessage.ERR_GET_PRODUCT_STOCK,
          HttpStatus.NOT_FOUND,
        );
      }
      await this.productStockRepository.softDelete(id);
      this.logger.debug(
        successProductStockMessage.SUCCESS_DELETE_PRODUCT_STOCK,
        productStock,
      );
      const response = {
        message: successProductStockMessage.SUCCESS_DELETE_PRODUCT_STOCK,
        data: {
          id: productStock.id,
          variantId: productStock.productVariant.id,
          branchId: productStock.branch.id,
          stock: productStock.stock,
          minStock: productStock.minStock,
          createdAt: productStock.createdAt,
          updatedAt: productStock.updatedAt,
        },
      };

      // Broadcast real-time update
      this.eventsGateway.broadcastStockUpdate({
        variantId: productStock.productVariant.id,
        branchId: productStock.branch.id,
        newStock: 0,
        removed: true,
      });

      return response;
    } catch (error) {
      this.logger.error(
        errProductStockMessage.ERR_DELETE_PRODUCT_STOCK,
        error.stack,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errProductStockMessage.ERR_DELETE_PRODUCT_STOCK,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
