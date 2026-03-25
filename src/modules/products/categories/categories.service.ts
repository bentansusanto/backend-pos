import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { errProductMessage } from 'src/libs/errors/error_product';
import { successProductMessage } from 'src/libs/success/success_product';
import { CategoryResponse } from 'src/types/response/product.type';
import { Repository } from 'typeorm';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from '../dto/create-category.dto';
import { Category } from '../entities/category.entities';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  // create category
  async create(
    createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponse> {
    // check category name is exist
    const categoryName = await this.categoryRepository.findOne({
      where: {
        name: createCategoryDto.name,
      },
    });
    if (categoryName) {
      throw new HttpException(
        errProductMessage.ERROR_CATEGORY_NAME_EXIST,
        HttpStatus.BAD_REQUEST,
      );
    }
    // creating category
    const category = this.categoryRepository.create(createCategoryDto);
    await this.categoryRepository.save(category);

    return {
      message: successProductMessage.SUCCESS_CREATE_CATEGORY,
      data: {
        id: category.id,
        name: category.name,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      },
    };
  }

  // find all categories
  async findAll(_branchId?: string): Promise<CategoryResponse> {
    const categories = await this.categoryRepository.find();

    return {
      message: successProductMessage.SUCCESS_FIND_ALL_CATEGORY,
      datas: categories.map((category) => ({
        id: category.id,
        name: category.name,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      })),
    };
  }

  // find category by id
  async findOne(id: string): Promise<CategoryResponse> {
    const category = await this.categoryRepository.findOne({
      where: {
        id,
      },
    });

    if (!category) {
      throw new HttpException(
        errProductMessage.ERROR_FIND_CATEGORY,
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      message: successProductMessage.SUCCESS_FIND_CATEGORY,
      data: {
        id: category.id,
        name: category.name,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      },
    };
  }

  // update category
  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponse> {
    const category = await this.categoryRepository.findOne({
      where: {
        id,
      },
    });
    if (!category) {
      throw new HttpException(
        errProductMessage.ERROR_FIND_CATEGORY,
        HttpStatus.NOT_FOUND,
      );
    }
    // update category
    await this.categoryRepository.update(id, updateCategoryDto);

    return {
      message: successProductMessage.SUCCESS_UPDATE_CATEGORY,
      data: {
        id: category.id,
        name: category.name,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      },
    };
  }

  // delete category
  async remove(id: string): Promise<CategoryResponse> {
    const category = await this.categoryRepository.findOne({
      where: {
        id,
      },
    });
    if (!category) {
      throw new HttpException(
        errProductMessage.ERROR_FIND_CATEGORY,
        HttpStatus.NOT_FOUND,
      );
    }
    // delete category
    await this.categoryRepository.delete(id);

    return {
      message: successProductMessage.SUCCESS_DELETE_CATEGORY,
    };
  }
}
