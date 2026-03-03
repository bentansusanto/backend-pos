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
import { WebResponse } from 'src/types/response/index.type';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierService } from './supplier.service';

@Controller('supplier')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createSupplierDto: CreateSupplierDto,
  ): Promise<WebResponse> {
    const result = await this.supplierService.create(createSupplierDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Get('find-all')
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<WebResponse> {
    const result = await this.supplierService.findAll();
    return {
      message: result.message,
      data: result.datas,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.supplierService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Put('update/:id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ): Promise<WebResponse> {
    const result = await this.supplierService.update(id, updateSupplierDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Delete('delete/:id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.supplierService.remove(id);
    return {
      message: result.message,
      data: result.data,
    };
  }
}
