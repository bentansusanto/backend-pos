import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { CurrentBranchId } from 'src/common/decorator/branch.decorator';
import { WebResponse } from 'src/types/response/index.type';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
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

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('branch_id') queryBranchId?: string,
    @CurrentBranchId() headerBranchId?: string,
  ): Promise<WebResponse> {
    const branchId = queryBranchId || headerBranchId;
    const result = await this.paymentsService.findAll(branchId);
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

  @Put(':id/verify')
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

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
  ): Promise<WebResponse> {
    await this.paymentsService.handleStripeWebhook(req.body, signature);
    return {
      message: 'Webhook handled successfully',
    };
  }
}
