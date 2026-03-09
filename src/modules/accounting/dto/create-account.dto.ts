import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { AccountType, CashflowType } from '../entities/accounting.enums';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(AccountType)
  @IsNotEmpty()
  type: AccountType;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsEnum(CashflowType)
  @IsOptional()
  cashflowType?: CashflowType;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
