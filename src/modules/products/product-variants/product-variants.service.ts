import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { errProductMessage } from 'src/libs/errors/error_product';
import { successProductMessage } from 'src/libs/success/success_product';
import { ProductVariantResponse } from 'src/types/response/product.type';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
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
  ) {}

  private generateSku(
    slug: string,
    productId: string,
    nameVariant: string,
    color: string,
    weight: number,
  ): string {
    const norm = (s: string) => s.replace(/[^a-z0-9]/gi, '').toUpperCase();
    const prod = norm(slug).slice(0, 8);
    const varc = norm(nameVariant).slice(0, 3);
    const col = norm(color).slice(0, 3);
    const wcode = Math.round(weight).toString().padStart(3, '0');
    const seed = `${productId}${color}${weight}`;
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

      return {
        message: successProductMessage.SUCCESS_CREATE_PRODUCT_VARIANT,
        data: {
          id: newProductVariant.id,
          product_id: newProductVariant.product.id,
          name_variant: newProductVariant.name_variant,
          price: newProductVariant.price,
          sku: newProductVariant.sku,
          weight: newProductVariant.weight,
          color: newProductVariant.color,
          thumbnail: newProductVariant.thumbnail,
          createdAt: newProductVariant.createdAt,
          updatedAt: newProductVariant.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errProductMessage.ERROR_CREATE_VARIANT, error.message);
      throw new HttpException(
        errProductMessage.ERROR_CREATE_VARIANT,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // update product variant
  async update(
    id: string,
    updateProductVariantDto: CreateProductVariantDto,
  ): Promise<ProductVariantResponse> {
    try {
      // check product variant is exist
      const productVariant = await this.productVariantRepository.findOne({
        where: { id },
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
        updateProductVariantDto.weight,
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
        ...updateProductVariantDto,
        sku,
        product: {
          id: productVariant.product.id,
        },
      });
      return {
        message: successProductMessage.SUCCESS_UPDATE_PRODUCT_VARIANT,
        data: {
          id: productVariant.id,
          product_id: productVariant.product.id,
          name_variant: productVariant.name_variant,
          price: productVariant.price,
          sku: productVariant.sku,
          weight: productVariant.weight,
          color: productVariant.color,
          thumbnail: productVariant.thumbnail,
          createdAt: productVariant.createdAt,
          updatedAt: productVariant.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errProductMessage.ERROR_UPDATE_VARIANT, error.message);
      throw new HttpException(
        errProductMessage.ERROR_UPDATE_VARIANT,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // delete product variant
  async delete(id: string): Promise<ProductVariantResponse> {
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
      return {
        message: successProductMessage.SUCCESS_DELETE_PRODUCT_VARIANT,
      };
    } catch (error) {
      this.logger.error(errProductMessage.ERROR_DELETE_VARIANT, error.message);
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
          name_variant: productVariant.name_variant,
          price: productVariant.price,
          sku: productVariant.sku,
          weight: productVariant.weight,
          color: productVariant.color,
          thumbnail: productVariant.thumbnail,
          createdAt: productVariant.createdAt,
          updatedAt: productVariant.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errProductMessage.ERROR_FIND_VARIANT, error.message);
      throw new HttpException(
        errProductMessage.ERROR_FIND_VARIANT,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // find all product variant
  async findAll(): Promise<ProductVariantResponse> {
    try {
      // check product variant is exist
      const productVariants = await this.productVariantRepository.find({
        relations: ['product'],
      });
      if (!productVariants) {
        this.logger.error(errProductMessage.ERROR_VARIANT_NOT_FOUND);
        throw new HttpException(
          errProductMessage.ERROR_VARIANT_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        message: successProductMessage.SUCCESS_FIND_VARIANT,
        datas: productVariants.map((productVariant) => ({
          id: productVariant.id,
          product_id: productVariant.product.id,
          name_variant: productVariant.name_variant,
          price: productVariant.price,
          sku: productVariant.sku,
          weight: productVariant.weight,
          color: productVariant.color,
          thumbnail: productVariant.thumbnail,
          createdAt: productVariant.createdAt,
          updatedAt: productVariant.updatedAt,
        })),
      };
    } catch (error) {
      this.logger.error(errProductMessage.ERROR_FIND_VARIANT, error.message);
      throw new HttpException(
        errProductMessage.ERROR_FIND_VARIANT,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
