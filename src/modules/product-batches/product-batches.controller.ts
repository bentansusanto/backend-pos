import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { Permissions } from 'src/common/decorator/permissions.decorator';
import { Roles } from 'src/common/decorator/roles.decorator';
import { WebResponse } from 'src/types/response/index.type';
import { CreateProductBatchDto } from './dto/create-product-batch.dto';
import { UpdateProductBatchDto } from './dto/update-product-batch.dto';
import { ProductBatchesService } from './product-batches.service';

@Controller('product-batches')
export class ProductBatchesController {
  constructor(private readonly productBatchesService: ProductBatchesService) {}

  @Roles('admin', 'staff', 'owner')
  @Permissions('create:product-batch')
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createProductBatchDto: CreateProductBatchDto,
  ): Promise<WebResponse> {
    const result = await this.productBatchesService.create(
      createProductBatchDto,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Roles('admin', 'staff', 'owner')
  @Permissions('read:product-batch')
  @Get('find-all')
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<WebResponse> {
    const result = await this.productBatchesService.findAll();
    return {
      message: result.message,
      data: result.datas,
    };
  }

  @Roles('admin', 'staff', 'owner')
  @Permissions('read:product-batch')
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.productBatchesService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Roles('admin', 'staff', 'owner')
  @Permissions('update:product-batch')
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateProductBatchDto: UpdateProductBatchDto,
  ): Promise<WebResponse> {
    const result = await this.productBatchesService.update(
      id,
      updateProductBatchDto,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Roles('admin', 'staff', 'owner')
  @Permissions('delete:product-batch')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.productBatchesService.remove(id);
    return {
      message: result.message,
    };
  }
}
