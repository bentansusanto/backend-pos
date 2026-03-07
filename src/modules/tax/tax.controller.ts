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
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { TaxService } from './tax.service';
import { WebResponse } from 'src/types/response/index.type';

@Controller('taxes')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTaxDto: CreateTaxDto):Promise<WebResponse> {
    const result = await this.taxService.create(createTaxDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Get('find-all')
  @HttpCode(HttpStatus.OK)
  async findAll():Promise<WebResponse> {
    const result = await this.taxService.findAll();
    return {
      message: result.message,
      data: result.datas,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string):Promise<WebResponse> {
    const result = await this.taxService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Put('update/:id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() updateTaxDto: UpdateTaxDto):Promise<WebResponse> {
    const result = await this.taxService.update(id, updateTaxDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Delete('delete/:id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string):Promise<WebResponse> {
    const result = await this.taxService.remove(id);
    return {
      message: result.message,
      data: result.data,
    };
  }
}
