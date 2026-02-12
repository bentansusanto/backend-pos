import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { errBranchMessage } from 'src/libs/errors/error_branch';
import { errProductMessage } from 'src/libs/errors/error_product';
import { errProductBatchMessage } from 'src/libs/errors/error_product_batch';
import { successProductBatchMessage } from 'src/libs/success/success_product_batch';
import { ProductBatchResponse } from 'src/types/response/product-batch.type';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { BranchesService } from '../branches/branches.service';
import { ProductVariantsService } from '../products/product-variants/product-variants.service';
import { CreateProductBatchDto } from './dto/create-product-batch.dto';
import { UpdateProductBatchDto } from './dto/update-product-batch.dto';
import { ProductBatch } from './entities/product-batch.entity';

@Injectable()
export class ProductBatchesService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(ProductBatch)
    private readonly productBatchRepository: Repository<ProductBatch>,
    private readonly productVariantService: ProductVariantsService,
    private readonly branchService: BranchesService,
  ) {}

  // create product batch
  async create(
    createProductBatchDto: CreateProductBatchDto,
  ): Promise<ProductBatchResponse> {
    try {
      // check branch and product variant exist
      const [branch, variant] = await Promise.all([
        this.branchService.findOne(createProductBatchDto.branchId),
        this.productVariantService.findOne(createProductBatchDto.variantId),
      ]);
      if (!branch) {
        throw new HttpException(
          errBranchMessage.BRANCH_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        );
      }
      if (!variant) {
        throw new HttpException(
          errProductMessage.ERROR_FIND_VARIANT,
          HttpStatus.NOT_FOUND,
        );
      }

      // create product batch
      const productBatch = this.productBatchRepository.create({
        ...createProductBatchDto,
        batch_code: `PB-${Date.now()}`,
        branch: { id: branch.data.id },
        productVariant: { id: variant.data.id },
      });
      await this.productBatchRepository.save(productBatch);
      return {
        message: successProductBatchMessage.SUCCESS_CREATE_PRODUCT_BATCH,
        data: {
          id: productBatch.id,
          variantId: productBatch.productVariant.id,
          branchId: productBatch.branch.id,
          exp_date: productBatch.exp_date,
          qty: productBatch.qty,
          batch_code: productBatch.batch_code,
          createdAt: productBatch.createdAt,
          updatedAt: productBatch.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errProductBatchMessage.ERR_CREATE_PRODUCT_BATCH, error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new HttpException(
        errProductBatchMessage.ERR_CREATE_PRODUCT_BATCH,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // find all product batches
  async findAll(): Promise<ProductBatchResponse> {
    try {
      const productBatches = await this.productBatchRepository.find({
        relations: ['branch', 'productVariant'],
      });
      return {
        message: successProductBatchMessage.SUCCESS_GET_PRODUCT_BATCHES,
        datas: productBatches.map((productBatch) => ({
          id: productBatch.id,
          variantId: productBatch.productVariant.id,
          branchId: productBatch.branch.id,
          exp_date: productBatch.exp_date,
          qty: productBatch.qty,
          batch_code: productBatch.batch_code,
          createdAt: productBatch.createdAt,
          updatedAt: productBatch.updatedAt,
        })),
      };
    } catch (error) {
      this.logger.error(errProductBatchMessage.ERR_GET_PRODUCT_BATCHES, error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new HttpException(
        errProductBatchMessage.ERR_GET_PRODUCT_BATCHES,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // find product batch by id
  async findOne(id: string): Promise<ProductBatchResponse> {
    try {
      const productBatch = await this.productBatchRepository.findOne({
        where: { id },
        relations: ['branch', 'productVariant'],
      });
      if (!productBatch) {
        throw new HttpException(
          errProductBatchMessage.ERR_GET_PRODUCT_BATCH,
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        message: successProductBatchMessage.SUCCESS_GET_PRODUCT_BATCH,
        data: {
          id: productBatch.id,
          variantId: productBatch.productVariant.id,
          branchId: productBatch.branch.id,
          exp_date: productBatch.exp_date,
          qty: productBatch.qty,
          batch_code: productBatch.batch_code,
          createdAt: productBatch.createdAt,
          updatedAt: productBatch.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errProductBatchMessage.ERR_GET_PRODUCT_BATCH, error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new HttpException(
        errProductBatchMessage.ERR_GET_PRODUCT_BATCH,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // update product batch
  async update(
    id: string,
    updateProductBatchDto: UpdateProductBatchDto,
  ): Promise<ProductBatchResponse> {
    try {
      const productBatch = await this.productBatchRepository.findOne({
        where: { id },
        relations: ['branch', 'productVariant'],
      });
      if (!productBatch) {
        throw new HttpException(
          errProductBatchMessage.ERR_GET_PRODUCT_BATCH,
          HttpStatus.NOT_FOUND,
        );
      }
      await this.productBatchRepository.update(id, updateProductBatchDto);
      return {
        message: successProductBatchMessage.SUCCESS_UPDATE_PRODUCT_BATCH,
        data: {
          id: productBatch.id,
          variantId: productBatch.productVariant.id,
          branchId: productBatch.branch.id,
          exp_date: productBatch.exp_date,
          qty: productBatch.qty,
          batch_code: productBatch.batch_code,
          createdAt: productBatch.createdAt,
          updatedAt: productBatch.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errProductBatchMessage.ERR_UPDATE_PRODUCT_BATCH, error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new HttpException(
        errProductBatchMessage.ERR_UPDATE_PRODUCT_BATCH,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // soft delete product batch
  async remove(id: string): Promise<ProductBatchResponse> {
    try {
      const productBatch = await this.productBatchRepository.findOne({
        where: { id },
        relations: ['branch', 'productVariant'],
      });
      if (!productBatch) {
        throw new HttpException(
          errProductBatchMessage.ERR_GET_PRODUCT_BATCH,
          HttpStatus.NOT_FOUND,
        );
      }
      await this.productBatchRepository.softDelete(id);
      return {
        message: successProductBatchMessage.SUCCESS_DELETE_PRODUCT_BATCH,
      };
    } catch (error) {
      this.logger.error(errProductBatchMessage.ERR_DELETE_PRODUCT_BATCH, error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new HttpException(
        errProductBatchMessage.ERR_DELETE_PRODUCT_BATCH,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
