import { PartialType } from '@nestjs/mapped-types';
import { IsDate, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateExpenseDto {
  @IsString({ message: 'branch_id must be a string' })
  @IsNotEmpty({ message: 'branch_id is required' })
  branch_id: string;

  @IsString({ message: 'expense_category_id must be a string' })
  @IsNotEmpty({ message: 'expense_category_id is required' })
  expense_category_id: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'amount must be a number' })
  @IsNotEmpty({ message: 'amount is required' })
  amount: number;

  @IsString({ message: 'description must be a string' })
  @IsNotEmpty({ message: 'description is required' })
  description: string;

  @IsString({ message: 'notes must be a string' })
  @IsNotEmpty({ message: 'notes is required' })
  notes: string;

  @IsDate({ message: 'expense_date must be a valid date' })
  @IsNotEmpty({ message: 'expense_date is required' })
  expense_date: Date;

  @IsString({ message: 'payment_method must be a string' })
  @IsNotEmpty({ message: 'payment_method is required' })
  payment_method: string;
}

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}
