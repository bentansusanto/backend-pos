import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { errProductMessage } from 'src/libs/errors/error_product';
import { successProductMessage } from 'src/libs/success/success_product';
import { CategoryResponse } from 'src/types/response/product.type';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from '../dto/create-category.dto';
import { Category } from '../entities/category.entities';

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  // create category
  async create(
    createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponse> {
    try {
      // check category name is exist
      const categoryName = await this.categoryRepository.findOne({
        where: {
          name: createCategoryDto.name,
        },
      });
      if (categoryName) {
        this.logger.error(errProductMessage.ERROR_CATEGORY_NAME_EXIST);
        throw new HttpException(
          errProductMessage.ERROR_CATEGORY_NAME_EXIST,
          HttpStatus.BAD_REQUEST,
        );
      }
      // creating category
      const category = this.categoryRepository.create(createCategoryDto);
      await this.categoryRepository.save(category);
      this.logger.info(
        `${successProductMessage.SUCCESS_CREATE_CATEGORY} with name: ${category.name}`,
      );
      return {
        message: successProductMessage.SUCCESS_CREATE_CATEGORY,
        data: {
          id: category.id,
          name: category.name,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errProductMessage.ERROR_CREATE_CATEGORY, error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errProductMessage.ERROR_CREATE_CATEGORY,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // find all categories
  async findAll(): Promise<CategoryResponse> {
    try {
      // check category is exist
      const categories = await this.categoryRepository.find();
      if (categories.length === 0) {
        this.logger.warn(errProductMessage.ERROR_FIND_ALL_CATEGORY);
        throw new HttpException(
          errProductMessage.ERROR_FIND_ALL_CATEGORY,
          HttpStatus.NOT_FOUND,
        );
      }
      this.logger.info(
        `${successProductMessage.SUCCESS_FIND_ALL_CATEGORY} with ${categories.length} categories`,
      );
      return {
        message: successProductMessage.SUCCESS_FIND_ALL_CATEGORY,
        datas: categories.map((category) => ({
          id: category.id,
          name: category.name,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
        })),
      };
    } catch (error) {
      this.logger.error(
        errProductMessage.ERROR_FIND_ALL_CATEGORY,
        error.message,
      );
      throw new HttpException(
        errProductMessage.ERROR_FIND_ALL_CATEGORY,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // find category by id
  async findOne(id: string): Promise<CategoryResponse> {
    try {
      // check category is exist
      const category = await this.categoryRepository.findOne({
        where: {
          id,
        },
      });
      if (!category) {
        this.logger.warn(errProductMessage.ERROR_FIND_CATEGORY);
        throw new HttpException(
          errProductMessage.ERROR_FIND_CATEGORY,
          HttpStatus.NOT_FOUND,
        );
      }
      this.logger.info(
        `${successProductMessage.SUCCESS_FIND_CATEGORY} with id: ${category.id}`,
      );
      return {
        message: successProductMessage.SUCCESS_FIND_CATEGORY,
        data: {
          id: category.id,
          name: category.name,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errProductMessage.ERROR_FIND_CATEGORY, error.message);
      throw new HttpException(
        errProductMessage.ERROR_FIND_CATEGORY,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // update category
  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponse> {
    try {
      // check category is exist
      const category = await this.categoryRepository.findOne({
        where: {
          id,
        },
      });
      if (!category) {
        this.logger.warn(errProductMessage.ERROR_FIND_CATEGORY);
        throw new HttpException(
          errProductMessage.ERROR_FIND_CATEGORY,
          HttpStatus.NOT_FOUND,
        );
      }
      // update category
      await this.categoryRepository.update(id, updateCategoryDto);
      this.logger.info(
        `${successProductMessage.SUCCESS_UPDATE_CATEGORY} with id: ${category.id}`,
      );
      return {
        message: successProductMessage.SUCCESS_UPDATE_CATEGORY,
        data: {
          id: category.id,
          name: category.name,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errProductMessage.ERROR_UPDATE_CATEGORY, error.message);
      throw new HttpException(
        errProductMessage.ERROR_UPDATE_CATEGORY,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // delete category
  async remove(id: string): Promise<CategoryResponse> {
    try {
      // check category is exist
      const category = await this.categoryRepository.findOne({
        where: {
          id,
        },
      });
      if (!category) {
        this.logger.warn(errProductMessage.ERROR_FIND_CATEGORY);
        throw new HttpException(
          errProductMessage.ERROR_FIND_CATEGORY,
          HttpStatus.NOT_FOUND,
        );
      }
      // delete category
      await this.categoryRepository.delete(id);
      this.logger.info(
        `${successProductMessage.SUCCESS_DELETE_CATEGORY} with id: ${category.id}`,
      );
      return {
        message: successProductMessage.SUCCESS_DELETE_CATEGORY,
      };
    } catch (error) {
      this.logger.error(errProductMessage.ERROR_DELETE_CATEGORY, error.message);
      throw new HttpException(
        errProductMessage.ERROR_DELETE_CATEGORY,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
