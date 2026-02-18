import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemDto {
  @IsOptional()
  @IsString({ message: 'Product variant ID must be a string' })
  variantId: string;

  @IsOptional()
  @IsString({ message: 'Product ID must be a string' })
  productId: string;

  @IsString({ message: 'Quantity must be a string' })
  quantity: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Price must be a number' })
  price: number;
}

export class CreateOrderDto {
  @IsOptional()
  @IsString({ message: 'Order ID must be a string' })
  order_id: string;

  @IsOptional()
  @IsString({ message: 'Branch ID must be a string' })
  branch_id: string;

  @IsOptional()
  @IsString({ message: 'User ID must be a string' })
  user_id: string;

  @IsOptional()
  @IsString({ message: 'Customer ID must be a string' })
  customer_id: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes: string;
}

export class UpdateOrderDto extends PartialType(CreateOrderDto) {
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes: string;
}
