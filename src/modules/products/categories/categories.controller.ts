import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentBranchId } from 'src/common/decorator/branch.decorator';
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
  @Post()
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
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('branch_id') queryBranchId?: string,
    @CurrentBranchId() headerBranchId?: string,
  ): Promise<WebResponse> {
    const branchId = queryBranchId || headerBranchId;
    const result = await this.categoriesService.findAll(branchId);
    return {
      message: result.message,
      data: result.datas,
    };
  }

  // find category by id
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.categoriesService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // update category
  @Put(':id')
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
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.categoriesService.remove(id);
    return {
      message: result.message,
    };
  }
}
