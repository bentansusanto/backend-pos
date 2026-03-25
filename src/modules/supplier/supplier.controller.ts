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
  Req,
} from '@nestjs/common';
import { WebResponse } from 'src/types/response/index.type';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierService } from './supplier.service';

@Controller('suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createSupplierDto: CreateSupplierDto,
    @Req() req: any,
  ): Promise<WebResponse> {
    const result = await this.supplierService.create(
      createSupplierDto,
      req.user?.id,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Get()
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

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
    @Req() req: any,
  ): Promise<WebResponse> {
    const result = await this.supplierService.update(
      id,
      updateSupplierDto,
      req.user?.id,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @Req() req: any): Promise<WebResponse> {
    const result = await this.supplierService.remove(id, req.user?.id);
    return {
      message: result.message,
      data: result.data,
    };
  }
}
