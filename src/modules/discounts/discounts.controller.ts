import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import {
  CreateDiscountDto,
  UpdateDiscountDto,
} from './dto/create-discount.dto';
import { WebResponse } from 'src/types/response/index.type';
import { CurrentBranchId } from 'src/common/decorator/branch.decorator';

@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Post('create')
  async create(@Body() createDiscountDto: CreateDiscountDto):Promise<WebResponse> {
    const result = await this.discountsService.create(createDiscountDto);
    return{
      message: result.message,
      data: result.data,
    }
  }

  @Get('find-all')
  async findAll(
    @Query('branch_id') queryBranchId?: string,
    @CurrentBranchId() headerBranchId?: string,
  ):Promise<WebResponse> {
    const branchId = queryBranchId || headerBranchId;
    const result = await this.discountsService.findAll(branchId);
    return{
      message: result.message,
      data: result.datas,
    }
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Query('branch_id') queryBranchId?: string,
    @CurrentBranchId() headerBranchId?: string,
  ):Promise<WebResponse> {
    const branchId = queryBranchId || headerBranchId;
    const result = await this.discountsService.findOne(id, branchId);
    return{
      message: result.message,
      data: result.data,
    }
  }

  @Put('update/:id')
  async update(
    @Param('id') id: string,
    @Body() updateDiscountDto: UpdateDiscountDto,
  ):Promise<WebResponse> {
    const result = await this.discountsService.update(id, updateDiscountDto);
    return{
      message: result.message,
      data: result.data,
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string):Promise<WebResponse> {
    const result = await this.discountsService.remove(id);
    return{
      message: result.message,
    }
  }
}
