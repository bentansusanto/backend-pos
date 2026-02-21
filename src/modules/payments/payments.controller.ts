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
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles('admin', 'cashier', 'owner')
  @Permissions('payments:create')
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createPaymentDto: CreatePaymentDto,
  ): Promise<WebResponse> {
    const result = await this.paymentsService.create(createPaymentDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Get('find-all')
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<WebResponse> {
    const result = await this.paymentsService.findAll();
    return {
      message: result.message,
      data: result.datas,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.paymentsService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Roles('admin', 'cashier', 'owner')
  @Permissions('payments:update')
  @Put('verify-payment/:id')
  @HttpCode(HttpStatus.OK)
  async verifyPayment(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.paymentsService.verifyPayment(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paymentsService.remove(id);
  }
}
