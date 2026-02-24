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
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { UpdateStockMovementDto } from './dto/update-stock-movement.dto';
import { StockMovementsService } from './stock-movements.service';
import { Roles } from 'src/common/decorator/roles.decorator';
import { Permissions } from 'src/common/decorator/permissions.decorator';
import { Role } from 'src/common/constants/roles.constant';
import { Permission } from 'src/common/constants/permissions.constant';
import { WebResponse } from 'src/types/response/index.type';

@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Roles(Role.OWNER, Role.ADMIN, Role.INVENTORY_STAFF, Role.BRANCH_MANAGER)
  @Permissions(Permission.STOCK_MOVEMENTS_CREATE)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createStockMovementDto: CreateStockMovementDto,
  ): Promise<WebResponse> {
    const result = await this.stockMovementsService.create(createStockMovementDto);
    return {
      message: 'Stock movement created successfully',
      data: result,
    };
  }

  @Roles(Role.OWNER, Role.ADMIN, Role.INVENTORY_STAFF, Role.BRANCH_MANAGER)
  @Permissions(Permission.STOCK_MOVEMENTS_READ)
  @Get()
  async findAll(@Query('branch_id') branchId?: string): Promise<WebResponse> {
    const result = await this.stockMovementsService.findAll(branchId);
    return {
      message: 'Stock movements retrieved successfully',
      data: result,
    };
  }

  @Roles(Role.OWNER, Role.ADMIN, Role.INVENTORY_STAFF, Role.BRANCH_MANAGER)
  @Permissions(Permission.STOCK_MOVEMENTS_READ)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.stockMovementsService.findOne(id);
    return {
      message: 'Stock movement retrieved successfully',
      data: result,
    };
  }

  @Roles(Role.OWNER, Role.ADMIN, Role.INVENTORY_STAFF)
  @Permissions(Permission.STOCK_MOVEMENTS_UPDATE)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateStockMovementDto: UpdateStockMovementDto,
  ): Promise<WebResponse> {
    const result = await this.stockMovementsService.update(+id, updateStockMovementDto);
    return {
      message: 'Stock movement updated successfully',
      data: result,
    };
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Permissions(Permission.STOCK_MOVEMENTS_DELETE)
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.stockMovementsService.remove(+id);
    return {
      message: 'Stock movement deleted successfully',
      data: result,
    };
  }
}
