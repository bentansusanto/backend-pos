import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { errProductMessage } from 'src/libs/errors/error_product';
import { successProductMessage } from 'src/libs/success/success_product';
import { ProductVariantResponse } from 'src/types/response/product.type';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import {
  ActionType,
  EntityType,
} from '../../user_logs/entities/user_log.entity';
import { UserLogsService } from '../../user_logs/user_logs.service';
import { CreateProductVariantDto } from '../dto/create-product-variant.dto';
import { ProductVariant } from '../entities/product-variant.entity';
import { ProductsService } from '../products.service';

@Injectable()
export class ProductVariantsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(ProductVariant)
    private readonly productVariantRepository: Repository<ProductVariant>,
    private readonly productsService: ProductsService,

    private readonly userLogsService: UserLogsService,
  ) {}

  // Helper function to generate sku like SKU-namesonly 3 characters-4digitrandomnumber
  // example: SKU-APP-1234
  private generateSku(
    _slug: string,
    _productId: string,
    _nameVariant: string,
    _color?: string,
    _weight?: number,
  ): string {
    const norm = (s: string) =>
      s ? s.replace(/[^a-z0-9]/gi, '').toUpperCase() : '';
    const prod = norm(_slug).slice(0, 8);
    const varc = norm(_nameVariant).slice(0, 3);
    const col = norm(_color).slice(0, 3);
    const wcode = Math.round(_weight || 0)
      .toString()
      .padStart(3, '0');
    const seed = `${_productId}${_color || ''}${_weight || 0}`;
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    }
    const short = h.toString(36).toUpperCase().slice(0, 4);
    return `${prod}-${varc}${col}-W${wcode}-${short}`;
  }


  // create product variant
  async create(
    createProductVariantDto: CreateProductVariantDto,
    userId?: string,
  ): Promise<ProductVariantResponse> {
    try {
      // check product is exist
      const product = await this.productsService.findOne(
        createProductVariantDto.productId,
      );
      if (!product) {
        this.logger.warn(errProductMessage.ERROR_VARIANT_NOT_FOUND);
        throw new HttpException(
          errProductMessage.ERROR_VARIANT_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        );
      }
      const baseSku = this.generateSku(
        product.data.slug,
        product.data.id,
        createProductVariantDto.name_variant,
        createProductVariantDto.color,
        createProductVariantDto.weight,
      );
      let sku = baseSku;
      const exists = await this.productVariantRepository.findOne({
        where: { sku },
      });
      if (exists) {
        for (let i = 1; i < 100; i++) {
          const candidate = `${baseSku}-${i}`;
          const c = await this.productVariantRepository.findOne({
            where: { sku: candidate },
          });
          if (!c) {
            sku = candidate;
            break;
          }
        }
      }
      // create product variant
      const newProductVariant = this.productVariantRepository.create({
        ...createProductVariantDto,
        sku,
        product: {
          id: product.data.id,
        },
      });

      await this.productVariantRepository.save(newProductVariant);

      // fire-and-forget log
      this.userLogsService.log({
        userId: userId ?? '',
        action: ActionType.CREATE,
        entityType: EntityType.PRODUCT_VARIANT,
        entityId: newProductVariant.id,
        description: `Variant "${newProductVariant.name_variant}" created for product ${product.data.id}`,
        metadata: {
          sku: newProductVariant.sku,
          price: newProductVariant.price,
          cost_price: newProductVariant.cost_price,
        },
      });

      return {
        message: successProductMessage.SUCCESS_CREATE_PRODUCT_VARIANT,
        data: {
          id: newProductVariant.id,
          product_id: newProductVariant.product.id,
          name_variant: newProductVariant.name_variant,
          price: newProductVariant.price,
          cost_price: newProductVariant.cost_price,
          sku: newProductVariant.sku,
          barcode: newProductVariant.barcode,
          weight: newProductVariant.weight,
          color: newProductVariant.color,
          createdAt: newProductVariant.createdAt,
          updatedAt: newProductVariant.updatedAt,
        },
      };
    } catch (error) {
      const errorMessage =
        error?.message || errProductMessage.ERROR_CREATE_VARIANT;
      this.logger.error(errProductMessage.ERROR_CREATE_VARIANT, errorMessage);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          Error: {
            field: 'general',
            body: errorMessage,
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // update product variant
  async update(
    id: string,
    updateProductVariantDto: CreateProductVariantDto,
    userId?: string,
  ): Promise<ProductVariantResponse> {
    try {
      // check product variant is exist
      const productVariant = await this.productVariantRepository.findOne({
        where: { id },
        relations: ['product'],
      });
      if (!productVariant) {
        this.logger.warn(errProductMessage.ERROR_VARIANT_NOT_FOUND);
        throw new HttpException(
          errProductMessage.ERROR_VARIANT_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        );
      }

      // validation sku
      const baseSku = this.generateSku(
        productVariant.product.slug,
        productVariant.product.id,
        updateProductVariantDto.name_variant,
        updateProductVariantDto.color,
        Number(updateProductVariantDto.weight),
      );
      let sku = baseSku;
      const exists = await this.productVariantRepository.findOne({
        where: { sku },
      });
      if (exists && exists.id !== id) {
        for (let i = 1; i < 100; i++) {
          const candidate = `${baseSku}-${i}`;
          const c = await this.productVariantRepository.findOne({
            where: { sku: candidate },
          });
          if (!c) {
            sku = candidate;
            break;
          }
        }
      }

      // update product variant
      await this.productVariantRepository.update(id, {
        product: { id: updateProductVariantDto.productId },
        name_variant: updateProductVariantDto.name_variant,
        price: Number(updateProductVariantDto.price || 0),
        cost_price: Number(updateProductVariantDto.cost_price || 0),
        weight: Number(updateProductVariantDto.weight || 0),
        color: updateProductVariantDto.color,
        sku,
        barcode: updateProductVariantDto.barcode,
      });

      // fire-and-forget log
      this.userLogsService.log({
        userId: userId ?? '',
        action: ActionType.UPDATE,
        entityType: EntityType.PRODUCT_VARIANT,
        entityId: id,
        description: `Variant "${updateProductVariantDto.name_variant}" updated`,
        metadata: { sku, price: updateProductVariantDto.price, cost_price: updateProductVariantDto.cost_price },
      });

      return {
        message: successProductMessage.SUCCESS_UPDATE_PRODUCT_VARIANT,
        data: {
          id: productVariant.id,
          product_id: productVariant.product.id,
          name_variant: productVariant.name_variant,
          price: productVariant.price,
          cost_price: productVariant.cost_price,
          sku: productVariant.sku,
          barcode: productVariant.barcode,
          weight: productVariant.weight,
          color: productVariant.color,
          createdAt: productVariant.createdAt,
          updatedAt: productVariant.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errProductMessage.ERROR_UPDATE_VARIANT, error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          Error: {
            field: 'general',
            body: error.message || errProductMessage.ERROR_UPDATE_VARIANT,
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // delete product variant
  async delete(id: string, userId?: string): Promise<ProductVariantResponse> {
    try {
      // check product variant is exist
      const productVariant = await this.productVariantRepository.findOne({
        where: { id },
      });
      if (!productVariant) {
        this.logger.error(errProductMessage.ERROR_VARIANT_NOT_FOUND);
        throw new HttpException(
          errProductMessage.ERROR_VARIANT_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        );
      }

      // delete product variant
      await this.productVariantRepository.softDelete(id);

      // fire-and-forget log
      this.userLogsService.log({
        userId: userId ?? '',
        action: ActionType.DELETE,
        entityType: EntityType.PRODUCT_VARIANT,
        entityId: id,
        description: `Variant ${id} deleted`,
      });

      return {
        message: successProductMessage.SUCCESS_DELETE_PRODUCT_VARIANT,
      };
    } catch (error) {
      this.logger.error(errProductMessage.ERROR_DELETE_VARIANT, error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errProductMessage.ERROR_DELETE_VARIANT,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // find product variant by id
  async findOne(id: string): Promise<ProductVariantResponse> {
    try {
      // check product variant is exist
      const productVariant = await this.productVariantRepository.findOne({
        where: { id },
        relations: ['product'],
      });
      if (!productVariant) {
        this.logger.error(errProductMessage.ERROR_VARIANT_NOT_FOUND);
        throw new HttpException(
          errProductMessage.ERROR_VARIANT_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        message: successProductMessage.SUCCESS_FIND_VARIANT,
        data: {
          id: productVariant.id,
          product_id: productVariant.product.id,
          product_name: productVariant.product.name_product,
          display_name: `${productVariant.product.name_product} - ${productVariant.name_variant}`,
          product: {
            id: productVariant.product.id,
            name_product: productVariant.product.name_product,
            slug: productVariant.product.slug,
            sku: productVariant.product.sku,
            thumbnail: productVariant.product.thumbnail,
          },
          name_variant: productVariant.name_variant,
          price: productVariant.price,
          cost_price: productVariant.cost_price,
          sku: productVariant.sku,
          barcode: productVariant.barcode,
          weight: productVariant.weight,
          color: productVariant.color,
          createdAt: productVariant.createdAt,
          updatedAt: productVariant.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errProductMessage.ERROR_FIND_VARIANT, error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errProductMessage.ERROR_FIND_VARIANT,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // find all product variant
  async findAll(branchId?: string): Promise<ProductVariantResponse> {
    try {
      // Use QueryBuilder with explicit LEFT JOINs so variants with no stock
      // records still appear (critical for Purchase Orders where stock = 0).
      const qb = this.productVariantRepository
        .createQueryBuilder('pv')
        .leftJoinAndSelect('pv.product', 'product')
        .leftJoinAndSelect('pv.productStocks', 'ps')
        .leftJoinAndSelect('ps.branch', 'branch')
        .where('pv.deletedAt IS NULL');

      if (branchId) {
        // Only show variants that have a stock record for this branch
        qb.andWhere(
          'EXISTS (SELECT 1 FROM product_stocks ps2 WHERE ps2.variant_id = pv.id AND ps2.branch_id = :branchId)',
          { branchId },
        );
      }

      const productVariants = await qb.getMany();

      return {
        message: successProductMessage.SUCCESS_FIND_VARIANT,
        datas: productVariants.map((productVariant) => {
          let totalStock = 0;
          if (branchId) {
            const stockRecord = productVariant.productStocks?.find(
              (s) => s.branch?.id === branchId,
            );
            totalStock = stockRecord ? Number(stockRecord.stock) : 0;
          } else {
            totalStock =
              productVariant.productStocks?.reduce(
                (acc, curr) => acc + Number(curr.stock),
                0,
              ) || 0;
          }

          return {
            id: productVariant.id,
            product_id: productVariant.product.id,
            product_name: productVariant.product.name_product,
            display_name: `${productVariant.product.name_product} - ${productVariant.name_variant}`,
            product: {
              id: productVariant.product.id,
              name_product: productVariant.product.name_product,
              slug: productVariant.product.slug,
              sku: productVariant.product.sku,
              thumbnail: productVariant.product.thumbnail,
            },
            name_variant: productVariant.name_variant,
            price: productVariant.price,
            cost_price: productVariant.cost_price,
            sku: productVariant.sku,
            barcode: productVariant.barcode,
            weight: productVariant.weight,
            color: productVariant.color,
            stock: totalStock,
            createdAt: productVariant.createdAt,
            updatedAt: productVariant.updatedAt,
          };
        }),
      };
    } catch (error) {
      this.logger.error(errProductMessage.ERROR_FIND_VARIANT, error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errProductMessage.ERROR_FIND_VARIANT,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
