import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateLoyaltySettingDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumSpend?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amountPerPoint?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  pointsEarned?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
