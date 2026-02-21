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
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { ProductsService } from './products.service';

import { Permissions } from 'src/common/decorator/permissions.decorator';
import { Roles } from 'src/common/decorator/roles.decorator';
import { WebResponse } from 'src/types/response/index.type';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Roles('admin', 'owner')
  @Permissions('products:create')
  @Post('create')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'images', maxCount: 5 },
    ]),
  )
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles()
    files: {
      thumbnail?: Express.Multer.File[];
      images?: Express.Multer.File[];
    },
  ): Promise<WebResponse> {
    const result = await this.productsService.create(
      createProductDto,
      files?.thumbnail?.[0],
      files?.images,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  // get all products
  @Permissions('products:read')
  @Get('find-all')
  @HttpCode(HttpStatus.OK)
  async findAll(@Query('branch_id') branchId?: string): Promise<WebResponse> {
    const result = await this.productsService.findAll(branchId);
    return {
      message: result.message,
      data: result.datas,
    };
  }

  // get product by id
  @Permissions('products:read')
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.productsService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // update product by id
  @Roles('admin', 'owner')
  @Permissions('products:update')
  @Put('update/:id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'images', maxCount: 5 },
    ]),
  )
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFiles()
    files: {
      thumbnail?: Express.Multer.File[];
      images?: Express.Multer.File[];
    },
  ): Promise<WebResponse> {
    const result = await this.productsService.update(
      id,
      updateProductDto,
      files?.thumbnail?.[0],
      files?.images,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  // delete product by id
  @Roles('admin', 'owner')
  @Permissions('products:delete')
  @Delete('delete/:id')
  async remove(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.productsService.remove(id);
    return {
      message: result.message,
    };
  }
}
