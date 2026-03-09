import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ReferenceType } from '../entities/accounting.enums';

export class CreateJournalLineDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsString()
  @IsNotEmpty()
  branchId: string;

  @IsNumber()
  @IsNotEmpty()
  debit: number;

  @IsNumber()
  @IsNotEmpty()
  credit: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateJournalEntryDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsEnum(ReferenceType)
  @IsNotEmpty()
  referenceType: ReferenceType;

  @IsString()
  @IsOptional()
  referenceCode?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateJournalLineDto)
  journalLines: CreateJournalLineDto[];
}
