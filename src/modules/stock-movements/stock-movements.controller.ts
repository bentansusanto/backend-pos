import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { UpdateStockMovementDto } from './dto/update-stock-movement.dto';
import { StockMovementsService } from './stock-movements.service';

@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Post()
  create(@Body() createStockMovementDto: CreateStockMovementDto) {
    return this.stockMovementsService.create(createStockMovementDto);
  }

  @Get()
  findAll(@Query('branch_id') branchId?: string) {
    return this.stockMovementsService.findAll(branchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stockMovementsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateStockMovementDto: UpdateStockMovementDto,
  ) {
    return this.stockMovementsService.update(+id, updateStockMovementDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.stockMovementsService.remove(+id);
  }
}
