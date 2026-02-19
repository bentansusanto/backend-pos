import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { referenceType } from '../entities/stock-movement.entity';

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
  @IsEnum(referenceType)
  referenceType: referenceType;

  @IsNotEmpty()
  @IsNumber()
  qty: number;

  @IsNotEmpty()
  @IsString()
  referenceId: string;
}
