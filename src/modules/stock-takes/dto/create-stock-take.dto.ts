import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateStockTakeDto {
  @IsNotEmpty()
  @IsString()
  branch_id: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isFrozen?: boolean;
}
