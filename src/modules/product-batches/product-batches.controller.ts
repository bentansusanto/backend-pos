import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CreateProductBatchDto,
  UpdateProductBatchDto,
} from './dto/create-product-batch.dto';
import { ProductBatchesService } from './product-batches.service';

@Controller('product-batches')
export class ProductBatchesController {
  constructor(private readonly productBatchesService: ProductBatchesService) {}

  @Post()
  create(@Body() createProductBatchDto: CreateProductBatchDto) {
    return this.productBatchesService.create(createProductBatchDto);
  }

  @Get()
  findAll() {
    return this.productBatchesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productBatchesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProductBatchDto: UpdateProductBatchDto,
  ) {
    return this.productBatchesService.update(id, updateProductBatchDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productBatchesService.remove(id);
  }
}
