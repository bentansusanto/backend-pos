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
import { CustomersService } from './customers.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
} from './dto/create-customer.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Roles('cashier', 'admin')
  @Permissions('create_customer')
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createCustomerDto: CreateCustomerDto,
  ): Promise<WebResponse> {
    const result = await this.customersService.create(createCustomerDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Roles('cashier', 'admin', 'owner')
  @Permissions('read_customer')
  @Get('find-all')
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<WebResponse> {
    const result = await this.customersService.findAll();
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Roles('cashier', 'admin', 'owner')
  @Permissions('read_customer')
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.customersService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Roles('cashier', 'admin', 'owner')
  @Permissions('update_customer')
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ): Promise<WebResponse> {
    const result = await this.customersService.update(id, updateCustomerDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Roles('cashier', 'admin', 'owner')
  @Permissions('delete_customer')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.customersService.remove(id);
    return {
      message: result.message,
    };
  }
}
