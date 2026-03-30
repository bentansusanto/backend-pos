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
} from '@nestjs/common';
import { CurrentBranchId } from 'src/common/decorator/branch.decorator';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { User } from 'src/modules/rbac/users/entities/user.entity';
import { WebResponse } from 'src/types/response/index.type';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: User,
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<WebResponse> {
    const result = await this.ordersService.create(createOrderDto, user?.id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @CurrentUser() user: User,
    @Query('branch_id') queryBranchId?: string,
    @Query('status') status?: any,
    @CurrentBranchId() headerBranchId?: string,
  ): Promise<WebResponse> {
    const branchId = queryBranchId || headerBranchId;
    const result = await this.ordersService.findAll(user?.id, branchId, status);
    return {
      message: result.message,
      data: result.datas,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.ordersService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ): Promise<WebResponse> {
    const result = await this.ordersService.update(id, updateOrderDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  async refundOrder(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('reason') reason?: string,
    @Body('reason_category_id') reasonCategoryId?: string,
  ): Promise<WebResponse> {
    const defaultReason = reason || 'Customer requested refund';
    const result = await this.ordersService.refundOrder(
      id,
      defaultReason,
      user?.id,
      reasonCategoryId,
    );
    return {
      message: result.message ?? 'Order refunded successfully',
      data: result.data,
    };
  }

  @Put(':id/items/:orderItemId/quantity')
  @HttpCode(HttpStatus.OK)
  async updateQuantity(
    @Param('id') id: string,
    @Param('orderItemId') orderItemId: string,
    @Body('quantity') quantity: number,
  ): Promise<WebResponse> {
    const result = await this.ordersService.updateQuantity(
      id,
      orderItemId,
      Number(quantity),
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Delete(':id/items/:orderItemId')
  async deleteOrderItems(
    @Param('id') id: string,
    @Param('orderItemId') orderItemId: string,
  ): Promise<WebResponse> {
    const result = await this.ordersService.deleteOrderItems(id, orderItemId);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
