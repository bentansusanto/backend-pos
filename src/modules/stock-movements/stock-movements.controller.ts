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
  ): Promise<WebResponse> {
    const result = await this.stockMovementsService.create(
      createStockMovementDto,
    );
    return {
      message: 'Stock movement created successfully',
      data: result,
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
      message: 'Stock movements retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.stockMovementsService.findOne(id);
    return {
      message: 'Stock movement retrieved successfully',
      data: result,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateStockMovementDto: UpdateStockMovementDto,
  ): Promise<WebResponse> {
    const result = await this.stockMovementsService.update(
      id,
      updateStockMovementDto,
    );
    return {
      message: 'Stock movement updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.stockMovementsService.remove(id);
    return {
      message: 'Stock movement deleted successfully',
      data: result,
    };
  }
}
