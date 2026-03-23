import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  PromotionActionType,
  PromotionConditionType,
  PromotionStatus,
} from '../enums/promotion.enum';

export class CreatePromotionRuleDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsEnum(PromotionConditionType)
  @IsNotEmpty()
  conditionType: PromotionConditionType;

  @IsNotEmpty()
  conditionValue: any;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  conditionVariantIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  conditionCategoryIds?: string[];

  @IsEnum(PromotionActionType)
  @IsNotEmpty()
  actionType: PromotionActionType;

  @IsNotEmpty()
  actionValue: any;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  actionVariantIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  actionCategoryIds?: string[];
}

export class CreatePromotionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PromotionStatus)
  @IsOptional()
  status?: PromotionStatus;

  @IsNumber()
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  isStackable?: boolean;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  branchIds?: string[];

  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreatePromotionRuleDto)
  rules: CreatePromotionRuleDto[];
}

export class UpdatePromotionDto extends PartialType(CreatePromotionDto) {}
