import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class PurchaseReceivingItemDto {
  @IsNotEmpty()
  @IsString()
  product_variant_id: string;

  @IsNotEmpty()
  @IsNumber()
  qty: number;

  @IsNotEmpty()
  @IsNumber()
  cost: number;
}

export class CreatePurchaseReceivingDto {
  @IsNotEmpty()
  @IsString()
  purchase_id: string;

  @IsNotEmpty()
  @IsString()
  supplier_id: string;

  @IsNotEmpty()
  @IsString()
  branch_id: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseReceivingItemDto)
  items: PurchaseReceivingItemDto[];
}
