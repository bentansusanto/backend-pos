import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  CloudinaryService,
  MulterFile,
} from 'src/common/cloudinary/cloudinary.service';
import { errProductMessage } from 'src/libs/errors/error_product';
import { successProductMessage } from 'src/libs/success/success_product';
import { ProductResponse } from 'src/types/response/product.type';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { CategoriesService } from './categories/categories.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';

import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly categoriesService: CategoriesService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // Helper function to generate slug
  private generateSlug(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-');
  }

  // Helper function to handle file uploads to Cloudinary
  private async handleFileUploads(
    thumbnailFile?: MulterFile,
    imageFiles?: MulterFile[],
    existingThumbnail?: string,
    existingImages?: string[],
  ): Promise<{ thumbnailUrl: string; imageUrls: string[] }> {
    let thumbnailUrl = existingThumbnail || '';
    let imageUrls = existingImages || [];

    // Upload thumbnail if provided
    if (thumbnailFile) {
      thumbnailUrl = await this.cloudinaryService.uploadFile(thumbnailFile);
    }

    // Upload images if provided
    if (imageFiles && imageFiles.length > 0) {
      const uploadedUrls =
        await this.cloudinaryService.uploadMultipleFiles(imageFiles);
      imageUrls = [...imageUrls, ...uploadedUrls];
    }

    return { thumbnailUrl, imageUrls };
  }

  // create product with optional file upload support
  async create(
    createProductDto: CreateProductDto,
    thumbnailFile?: MulterFile,
    imageFiles?: MulterFile[],
  ): Promise<ProductResponse> {
    try {
      // check category is exist
      const category = await this.categoriesService.findOne(
        createProductDto.category_id,
      );
      if (!category) {
        this.logger.error(
          `${errProductMessage.ERROR_CATEGORY_NOT_FOUND} with id: ${createProductDto.category_id}`,
        );
        throw new HttpException(
          errProductMessage.ERROR_CATEGORY_NOT_FOUND,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Handle file uploads if provided
      const { thumbnailUrl, imageUrls } = await this.handleFileUploads(
        thumbnailFile,
        imageFiles,
      );

      const newProduct = this.productRepository.create({
        ...createProductDto,
        category: {
          id: category.data.id,
        },
        slug: this.generateSlug(createProductDto.name_product),
        thumbnail: thumbnailUrl,
        images: imageUrls,
      });
      await this.productRepository.save(newProduct);

      this.logger.debug(
        `${successProductMessage.SUCCESS_CREATE_PRODUCT} with id: ${newProduct.id}`,
      );

      return {
        message: successProductMessage.SUCCESS_CREATE_PRODUCT,
        data: {
          id: newProduct.id,
          name_product: newProduct.name_product,
          price: newProduct.price,
          category_id: newProduct.category.id,
          slug: newProduct.slug,
          description: newProduct.description,
          thumbnail: newProduct.thumbnail,
          images: Array.isArray(newProduct.images) ? newProduct.images : [],
          createdAt: newProduct.createdAt,
          updatedAt: newProduct.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errProductMessage.ERROR_CREATE_PRODUCT, error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errProductMessage.ERROR_CREATE_PRODUCT,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(): Promise<ProductResponse> {
    try {
      const products = await this.productRepository.find({
        relations: ['category'],
      });
      if (!products || products.length === 0) {
        this.logger.error(errProductMessage.ERROR_FIND_ALL_PRODUCT);
        throw new HttpException(
          errProductMessage.ERROR_FIND_ALL_PRODUCT,
          HttpStatus.NOT_FOUND,
        );
      }

      this.logger.debug(
        `${successProductMessage.SUCCESS_FIND_ALL_PRODUCT} with ${products.length} products`,
      );

      return {
        message: successProductMessage.SUCCESS_FIND_ALL_PRODUCT,
        datas: products.map((product) => ({
          id: product.id,
          name_product: product.name_product,
          price: product.price,
          category_id: product.category.id,
          slug: product.slug,
          description: product.description,
          thumbnail: product.thumbnail,
          images: Array.isArray(product.images) ? product.images : [],
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        })),
      };
    } catch (error) {
      this.logger.error(
        errProductMessage.ERROR_FIND_ALL_PRODUCT,
        error.message,
      );
      throw new HttpException(
        errProductMessage.ERROR_FIND_ALL_PRODUCT,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // find product by id
  async findOne(id: string): Promise<ProductResponse> {
    try {
      const product = await this.productRepository.findOne({
        where: { id },
        relations: ['category'],
      });
      if (!product) {
        this.logger.error(
          `${errProductMessage.ERROR_FIND_PRODUCT} with id: ${id}`,
        );
        throw new HttpException(
          errProductMessage.ERROR_FIND_PRODUCT,
          HttpStatus.NOT_FOUND,
        );
      }

      this.logger.debug(
        `${successProductMessage.SUCCESS_FIND_PRODUCT} with id: ${product.id}`,
      );

      return {
        message: successProductMessage.SUCCESS_FIND_PRODUCT,
        data: {
          id: product.id,
          name_product: product.name_product,
          price: product.price,
          category_id: product.category.id,
          slug: product.slug,
          description: product.description,
          thumbnail: product.thumbnail,
          images: Array.isArray(product.images) ? product.images : [],
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errProductMessage.ERROR_FIND_PRODUCT, error.message);
      throw new HttpException(
        errProductMessage.ERROR_FIND_PRODUCT,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // update product with optional file upload support
  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    thumbnailFile?: MulterFile,
    imageFiles?: MulterFile[],
  ): Promise<ProductResponse> {
    try {
      // find product and category
      const [findCategory, findProduct] = await Promise.all([
        this.categoriesService.findOne(updateProductDto.category_id),
        this.productRepository.findOne({
          where: { id },
          relations: ['category'],
        }),
      ]);
      if (!findCategory) {
        this.logger.error(
          `${errProductMessage.ERROR_FIND_CATEGORY} with id: ${updateProductDto.category_id}`,
        );
        throw new HttpException(
          errProductMessage.ERROR_FIND_CATEGORY,
          HttpStatus.NOT_FOUND,
        );
      }

      if (!findProduct) {
        this.logger.error(
          `${errProductMessage.ERROR_FIND_PRODUCT} with id: ${id}`,
        );
        throw new HttpException(
          errProductMessage.ERROR_FIND_PRODUCT,
          HttpStatus.NOT_FOUND,
        );
      }

      // Handle file uploads if provided, otherwise use existing values
      const { thumbnailUrl, imageUrls } = await this.handleFileUploads(
        thumbnailFile,
        imageFiles,
        updateProductDto.thumbnail,
        updateProductDto.images,
      );

      // update product
      await this.productRepository.update(id, {
        name_product: updateProductDto.name_product,
        price: updateProductDto.price,
        category: {
          id: findCategory.data.id,
        },
        slug: this.generateSlug(updateProductDto.name_product),
        description: updateProductDto.description,
        thumbnail: thumbnailUrl,
        images: imageUrls,
      });

      this.logger.debug(
        `${successProductMessage.SUCCESS_UPDATE_PRODUCT} with id: ${findProduct.id}`,
      );

      return {
        message: successProductMessage.SUCCESS_UPDATE_PRODUCT,
        data: {
          id: findProduct.id,
          name_product: findProduct.name_product,
          price: findProduct.price,
          category_id: findProduct.category.id,
          slug: findProduct.slug,
          description: findProduct.description,
          thumbnail: findProduct.thumbnail,
          images: Array.isArray(findProduct.images) ? findProduct.images : [],
          createdAt: findProduct.createdAt,
          updatedAt: findProduct.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errProductMessage.ERROR_UPDATE_PRODUCT, error.message);
      throw new HttpException(
        errProductMessage.ERROR_UPDATE_PRODUCT,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // delete product
  async remove(id: string): Promise<ProductResponse> {
    try {
      // check product is exist
      const product = await this.productRepository.findOne({
        where: { id },
        relations: ['category'],
      });
      if (!product) {
        this.logger.error(
          `${errProductMessage.ERROR_FIND_PRODUCT} with id: ${id}`,
        );
        throw new HttpException(
          errProductMessage.ERROR_FIND_PRODUCT,
          HttpStatus.NOT_FOUND,
        );
      }

      // delete product
      await this.productRepository.softDelete(id);

      this.logger.debug(
        `${successProductMessage.SUCCESS_DELETE_PRODUCT} with id: ${product.id}`,
      );

      return {
        message: successProductMessage.SUCCESS_DELETE_PRODUCT,
      };
    } catch (error) {
      this.logger.error(errProductMessage.ERROR_DELETE_PRODUCT, error.message);
      throw new HttpException(
        errProductMessage.ERROR_DELETE_PRODUCT,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
