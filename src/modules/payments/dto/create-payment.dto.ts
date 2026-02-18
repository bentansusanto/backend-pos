import { IsNotEmpty, IsString } from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';
export class CreatePaymentDto {
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @IsNotEmpty()
  @IsString()
  method: PaymentMethod;
}
