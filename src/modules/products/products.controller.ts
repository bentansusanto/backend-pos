import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';

import { Roles } from 'src/common/decorator/roles.decorator';
import { Permissions } from 'src/common/decorator/permissions.decorator';
import { WebResponse } from 'src/types/response/index.type';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Roles('admin', 'owner')
  @Permissions('create_product')
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createProductDto: CreateProductDto,
  ): Promise<WebResponse> {
    const result = await this.productsService.create(createProductDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // get all products
  @Permissions('read_product')
  @Get('find-all')
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<WebResponse> {
    const result = await this.productsService.findAll();
    return {
      message: result.message,
      data: result.datas,
    };
  }

  // get product by id
  @Permissions('read_product')
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
  @Permissions('update_product')
  @Put('update/:id')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<WebResponse> {
    const result = await this.productsService.update(id, updateProductDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // delete product by id
  @Roles('admin', 'owner')
  @Permissions('delete_product')
  @Delete('delete/:id')
  async remove(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.productsService.remove(id);
    return {
      message: result.message,
    };
  }
}
