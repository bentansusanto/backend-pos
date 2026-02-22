import { PartialType } from '@nestjs/mapped-types';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateProductStockDto {
  @IsString({ message: 'productId must be a string' })
  productId: string;

  @IsOptional()
  @IsString({ message: 'variantId must be a string' })
  variantId?: string;

  @IsString({ message: 'branchId must be a string' })
  branchId: string;

  @IsNumber({}, { message: 'stock must be a number' })
  stock: number;

  @IsNumber({}, { message: 'minStock must be a number' })
  minStock: number;
}

export class UpdateProductStockDto extends PartialType(CreateProductStockDto) {}
