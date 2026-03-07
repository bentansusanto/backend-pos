import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';
import { DiscountType } from '../entities/discount.entity';

export class CreateDiscountDto {
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @IsString({ message: 'Description must be a string' })
  @IsNotEmpty({ message: 'Description is required' })
  description: string;

  @IsEnum(DiscountType, { message: "Type must be 'percentage' or 'fixed'" })
  @IsNotEmpty({ message: 'Type is required' })
  type: DiscountType;

  @IsNumber({}, { message: 'Value must be a number' })
  @IsNotEmpty({ message: 'Value is required' })
  value: number;

  @Type(() => Date)
  @IsDate({ message: 'Start date must be a valid date' })
  @IsNotEmpty({ message: 'Start date is required' })
  startDate: Date;

  @Type(() => Date)
  @IsDate({ message: 'End date must be a valid date' })
  @IsNotEmpty({ message: 'End date is required' })
  endDate: Date;

  @IsBoolean({ message: 'Is active must be a boolean' })
  @IsNotEmpty({ message: 'Is active is required' })
  isActive: boolean;
}

export class UpdateDiscountDto extends PartialType(CreateDiscountDto) {}
