import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { CreateProductWithFilesDto } from './create-product-with-files.dto';

export class UpdateProductWithFilesDto extends PartialType(
  CreateProductWithFilesDto,
) {
  @IsOptional()
  @IsString({ message: 'Thumbnail must be a string' })
  thumbnail?: string;

  @IsOptional()
  @IsString({ each: true, message: 'Each image must be a string' })
  images?: string[];
}
