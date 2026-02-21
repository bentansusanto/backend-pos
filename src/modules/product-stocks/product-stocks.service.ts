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
import { referenceType } from '../stock-movements/entities/stock-movement.entity';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
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
  ) {}

  // create product stock
  async create(
    createProductStockDto: CreateProductStockDto,
  ): Promise<ProductStockResponse> {
    try {
      // check branch and product variant exists
      const [branch, productVariant] = await Promise.all([
        this.branchService.findOne(createProductStockDto.branchId),
        this.productVariantService.findOne(createProductStockDto.variantId),
      ]);
      if (!branch) {
        this.logger.error(errBranchMessage.BRANCH_NOT_FOUND);
        throw new HttpException(
          errBranchMessage.BRANCH_NOT_FOUND,
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!productVariant) {
        this.logger.error(errProductMessage.ERROR_FIND_VARIANT);
        throw new HttpException(
          errProductMessage.ERROR_FIND_VARIANT,
          HttpStatus.BAD_REQUEST,
        );
      }

      // create product stock
      const productStock = this.productStockRepository.create({
        ...createProductStockDto,
        branch: {
          id: branch.data.id,
        },
        product: {
          id: productVariant.data.product_id,
        },
        productVariant: {
          id: productVariant.data.id,
        },
      });
      await this.productStockRepository.save(productStock);

      // Create stock movement for adjustment
      await this.stockMovementsService.create({
        productId: productVariant.data.product_id,
        variantId: productVariant.data.id,
        branchId: createProductStockDto.branchId,
        referenceType: referenceType.ADJUST,
        qty: createProductStockDto.stock,
        referenceId: productStock.id,
      });

      this.logger.debug(
        successProductStockMessage.SUCCESS_CREATE_PRODUCT_STOCK,
        productStock,
      );
      return {
        message: successProductStockMessage.SUCCESS_CREATE_PRODUCT_STOCK,
        data: {
          id: productStock.id,
          productId: productVariant.data.product_id,
          variantId: productVariant.data.id,
          branchId: branch.data.id,
          stock: productStock.stock,
          minStock: productStock.minStock,
          createdAt: productStock.createdAt,
          updatedAt: productStock.updatedAt,
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
  async findAll(): Promise<ProductStockResponse> {
    try {
      const productStocks = await this.productStockRepository.find({
        relations: ['branch', 'productVariant', 'product'],
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
          productId: productStock.product?.id,
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
        relations: ['branch', 'productVariant', 'product'],
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
          productId: productStock.product?.id,
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
  ): Promise<ProductStockResponse> {
    try {
      const productStock = await this.productStockRepository.findOne({
        where: {
          id,
        },
        relations: ['branch', 'productVariant', 'product'],
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
          productId: productStock.product?.id,
          variantId: productStock.productVariant?.id,
          branchId: productStock.branch?.id,
          referenceType: referenceType.ADJUST,
          qty: diff,
          referenceId: productStock.id,
        });
      }

      this.logger.debug(
        successProductStockMessage.SUCCESS_UPDATE_PRODUCT_STOCK,
        productStock,
      );
      return {
        message: successProductStockMessage.SUCCESS_UPDATE_PRODUCT_STOCK,
        data: {
          id: productStock.id,
          productId: productStock.product?.id,
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
      throw new HttpException(
        errProductStockMessage.ERR_UPDATE_PRODUCT_STOCK,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // delete product stock
  async remove(id: string): Promise<ProductStockResponse> {
    try {
      const productStock = await this.productStockRepository.findOne({
        where: {
          id,
        },
        relations: ['branch', 'productVariant', 'product'],
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
      return {
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
    } catch (error) {
      this.logger.error(
        errProductStockMessage.ERR_DELETE_PRODUCT_STOCK,
        error.stack,
      );
      throw new HttpException(
        errProductStockMessage.ERR_DELETE_PRODUCT_STOCK,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
