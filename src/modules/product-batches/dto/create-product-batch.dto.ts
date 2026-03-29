import { PartialType } from '@nestjs/mapped-types';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ProductBatchStatus } from '../entities/product-batch.entity';

export class CreateProductBatchDto {
  @IsString()
  @IsOptional()
  batchNumber?: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsNotEmpty()
  productVariantId: string;

  @IsString()
  @IsNotEmpty()
  branchId: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  purchaseReceivingId?: string;

  @IsNumber()
  @IsNotEmpty()
  initialQuantity: number;

  @IsNumber()
  @IsOptional()
  currentQuantity?: number;

  @IsNumber()
  @IsNotEmpty()
  costPrice: number;

  @IsDateString()
  @IsOptional()
  manufacturingDate?: string;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @IsDateString()
  @IsOptional()
  receivedDate?: string;

  @IsEnum(ProductBatchStatus)
  @IsOptional()
  status?: ProductBatchStatus;
}

export class UpdateProductBatchDto extends PartialType(CreateProductBatchDto) {}

export class DisposeProductBatchDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
