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
  Req,
} from '@nestjs/common';
import { CurrentBranchId } from 'src/common/decorator/branch.decorator';
import { WebResponse } from 'src/types/response/index.type';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { UpdateStockMovementDto } from './dto/update-stock-movement.dto';
import { StockMovementsService } from './stock-movements.service';

@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createStockMovementDto: CreateStockMovementDto,
    @Req() req: any,
  ): Promise<WebResponse> {
    const result = await this.stockMovementsService.create(
      createStockMovementDto,
      req.user?.id,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Get()
  async findAll(
    @Query('branch_id') queryBranchId?: string,
    @CurrentBranchId() headerBranchId?: string,
  ): Promise<WebResponse> {
    const branchId = queryBranchId || headerBranchId;
    const result = await this.stockMovementsService.findAll(branchId);
    return {
      message: result.message,
      data: result.datas,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.stockMovementsService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateStockMovementDto: UpdateStockMovementDto,
    @Req() req: any,
  ): Promise<WebResponse> {
    const result = await this.stockMovementsService.update(
      id,
      updateStockMovementDto,
      req.user?.id,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<WebResponse> {
    const result = await this.stockMovementsService.remove(id, req.user?.id);
    return {
      message: result.message,
      data: result.data,
    };
  }
}
