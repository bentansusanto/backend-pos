import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ReferenceType } from '../entities/stock-movement.entity';

export class CreateStockMovementDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsNotEmpty()
  @IsString()
  branchId: string;

  @IsNotEmpty()
  @IsEnum(ReferenceType)
  referenceType: ReferenceType;

  @IsNotEmpty()
  @IsNumber()
  qty: number;

  @IsNotEmpty()
  @IsString()
  referenceId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
