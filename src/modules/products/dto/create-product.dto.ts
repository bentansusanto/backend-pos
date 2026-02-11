import { PartialType } from '@nestjs/mapped-types';
import { IsJSON, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

import { IsString } from 'class-validator';

export class CreateProductDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  name_product: string;

  @IsNotEmpty({ message: 'Category is required' })
  @IsString({ message: 'Category must be a string' })
  category_id: string;

  @IsOptional()
  @IsNumber({}, { message: 'Price must be a number' })
  price: number;

  @IsNotEmpty({ message: 'Description is required' })
  @IsString({ message: 'Description must be a string' })
  description: string;

  @IsNotEmpty({ message: 'Thumbnail is required' })
  @IsString({ message: 'Thumbnail must be a string' })
  thumbnail: string;

  @IsNotEmpty({ message: 'image is required' })
  @IsJSON({ message: 'image must be a JSON string' })
  images: string[];
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}
