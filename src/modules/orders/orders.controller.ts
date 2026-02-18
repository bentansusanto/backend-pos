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
import { Permissions } from 'src/common/decorator/permissions.decorator';
import { Roles } from 'src/common/decorator/roles.decorator';
import { WebResponse } from 'src/types/response/index.type';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Permissions('create:order')
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createOrderDto: CreateOrderDto): Promise<WebResponse> {
    const result = await this.ordersService.create(createOrderDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Roles('cashier', 'admin', 'owner')
  @Permissions('read:order')
  @Get('find-all')
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<WebResponse> {
    const result = await this.ordersService.findAll();
    return {
      message: result.message,
      data: result.datas,
    };
  }

  @Roles('cashier', 'admin', 'owner')
  @Permissions('read:order')
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.ordersService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Roles('cashier', 'admin')
  @Permissions('update:order')
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

  @Roles('cashier', 'admin')
  @Permissions('update:order-quantity-item')
  @Put(':id/items/:orderItemId/quantity')
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

  @Roles('cashier', 'admin')
  @Permissions('delete:order')
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

  @Roles('cashier', 'admin')
  @Permissions('delete:order')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
