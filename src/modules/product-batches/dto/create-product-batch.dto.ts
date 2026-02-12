import { PartialType } from '@nestjs/mapped-types';
import { IsDate, IsNumber, IsString } from 'class-validator';

export class CreateProductBatchDto {
  @IsString({ message: 'variantId must be a string' })
  variantId: string;

  @IsString({ message: 'branchId must be a string' })
  branchId: string;

  @IsDate({ message: 'exp_date must be a date' })
  exp_date: Date;

  @IsNumber({}, { message: 'qty must be a number' })
  qty: number;
}

export class UpdateProductBatchDto extends PartialType(CreateProductBatchDto) {}
