import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { Permissions } from 'src/common/decorator/permissions.decorator';
import { Roles } from 'src/common/decorator/roles.decorator';
import { WebResponse } from 'src/types/response/index.type';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from '../dto/create-category.dto';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // create category
  @Roles('admin', 'owner')
  @Permissions('categories:create')
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<WebResponse> {
    const result = await this.categoriesService.create(createCategoryDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // find all categories
  @Permissions('categories:read')
  @Post('find-all')
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<WebResponse> {
    const result = await this.categoriesService.findAll();
    return {
      message: result.message,
      data: result.datas,
    };
  }

  // find category by id
  @Permissions('categories:read')
  @Post(':id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.categoriesService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // update category
  @Roles('admin', 'owner')
  @Permissions('categories:update')
  @Post(':id/update')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<WebResponse> {
    const result = await this.categoriesService.update(id, updateCategoryDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // delete category
  @Roles('admin', 'owner')
  @Permissions('categories:delete')
  @Post(':id/delete')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.categoriesService.remove(id);
    return {
      message: result.message,
    };
  }
}
