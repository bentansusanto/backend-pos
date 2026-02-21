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
} from '@nestjs/common';
import { Permissions } from 'src/common/decorator/permissions.decorator';
import { Roles } from 'src/common/decorator/roles.decorator';
import { WebResponse } from 'src/types/response/index.type';
import {
  CreateProductStockDto,
  UpdateProductStockDto,
} from './dto/create-product-stock.dto';
import { ProductStocksService } from './product-stocks.service';

@Controller('product-stocks')
export class ProductStocksController {
  constructor(private readonly productStocksService: ProductStocksService) {}

  @Roles('admin', 'staff', 'owner')
  @Permissions('stock:create')
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createProductStockDto: CreateProductStockDto,
  ): Promise<WebResponse> {
    const result = await this.productStocksService.create(
      createProductStockDto,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Roles('admin', 'staff', 'owner')
  @Permissions('read_product_stock')
  @Get('find-all')
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<WebResponse> {
    const result = await this.productStocksService.findAll();
    return {
      message: result.message,
      data: result.datas,
    };
  }

  @Roles('admin', 'staff', 'owner')
  @Permissions('read_product_stock')
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.productStocksService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Roles('admin', 'staff', 'owner')
  @Permissions('update_product_stock')
  @Put('update/:id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateProductStockDto: UpdateProductStockDto,
  ): Promise<WebResponse> {
    const result = await this.productStocksService.update(
      id,
      updateProductStockDto,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Roles('admin', 'staff', 'owner')
  @Permissions('delete_product_stock')
  @Delete('delete/:id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.productStocksService.remove(id);
    return {
      message: result.message,
    };
  }
}
