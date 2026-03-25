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
  UseGuards,
} from '@nestjs/common';
import { CurrentBranchId } from 'src/common/decorator/branch.decorator';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { User } from 'src/modules/rbac/users/entities/user.entity';
import { WebResponse } from 'src/types/response/index.type';
import {
  CreateProductStockDto,
  UpdateProductStockDto,
} from './dto/create-product-stock.dto';
import { ProductStocksService } from './product-stocks.service';

@UseGuards(JwtAuthGuard)
@Controller('product-stocks')
export class ProductStocksController {
  constructor(private readonly productStocksService: ProductStocksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createProductStockDto: CreateProductStockDto,
    @CurrentUser() currentUser: User,
  ): Promise<WebResponse> {
    const result = await this.productStocksService.create(
      createProductStockDto,
      currentUser?.id,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('branch_id') queryBranchId?: string,
    @CurrentBranchId() headerBranchId?: string,
  ): Promise<WebResponse> {
    const branchId = queryBranchId || headerBranchId;
    const result = await this.productStocksService.findAll(branchId);
    return {
      message: result.message,
      data: result.datas,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.productStocksService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateProductStockDto: UpdateProductStockDto,
    @CurrentUser() currentUser: User,
  ): Promise<WebResponse> {
    const result = await this.productStocksService.update(
      id,
      updateProductStockDto,
      currentUser?.id,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<WebResponse> {
    const result = await this.productStocksService.remove(id, currentUser?.id);
    return {
      message: result.message,
    };
  }
}
