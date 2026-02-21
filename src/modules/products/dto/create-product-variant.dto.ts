import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateProductVariantDto {
  @IsNotEmpty({ message: 'Product ID is required' })
  @IsString({ message: 'Product ID must be a string' })
  productId: string;

  @IsNotEmpty({ message: 'Name variant is required' })
  @IsString({ message: 'Name variant must be a string' })
  name_variant: string;

  @IsNotEmpty({ message: 'Price is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Price must be a number' })
  price: number;

  @IsNotEmpty({ message: 'Weight is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Weight must be a number' })
  weight: number;

  @IsNotEmpty({ message: 'Color is required' })
  @IsString({ message: 'Color must be a string' })
  color: string;

  @IsOptional()
  thumbnail: string;
}

export class UpdateProductVariantDto extends PartialType(
  CreateProductVariantDto,
) {}
