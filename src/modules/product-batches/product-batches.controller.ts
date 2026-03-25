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
  Query,
} from '@nestjs/common';
import {
  CreateProductBatchDto,
  UpdateProductBatchDto,
} from './dto/create-product-batch.dto';
import { ProductBatchesService } from './product-batches.service';
import { WebResponse } from 'src/types/response/index.type';

@Controller('product-batches')
export class ProductBatchesController {
  constructor(private readonly productBatchesService: ProductBatchesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createProductBatchDto: CreateProductBatchDto): Promise<WebResponse> {
    const result = await this.productBatchesService.create(createProductBatchDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: { branch_id?: string; variant_id?: string }): Promise<WebResponse> {
    const result = await this.productBatchesService.findAll(query);
    return {
      message: result.message,
      data: result.datas,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.productBatchesService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateProductBatchDto: UpdateProductBatchDto,
  ): Promise<WebResponse> {
    const result = await this.productBatchesService.update(id, updateProductBatchDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.productBatchesService.remove(id);
    return {
      message: result.message,
    };
  }
}
