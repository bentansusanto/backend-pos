import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class StockTakeItemDto {
  @IsNotEmpty()
  @IsString()
  variant_id: string;

  @IsNotEmpty()
  @IsNumber()
  countedQty: number;
}

export class SubmitStockTakeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockTakeItemDto)
  items: StockTakeItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
