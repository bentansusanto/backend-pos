import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OpenPosSessionDto {
  @IsNotEmpty({ message: 'Branch ID is required' })
  @IsString({ message: 'Branch ID must be a string' })
  branch_id: string;

  @IsNotEmpty({ message: 'Opening balance is required' })
  @IsNumber({}, { message: 'Opening balance must be a number' })
  openingBalance: number;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;
}

export class PaymentDeclarationDto {
  @IsNotEmpty()
  @IsString()
  method: string;

  @IsNotEmpty()
  @IsNumber({}, { message: 'Declared amount must be a number' })
  declaredAmount: number;
}

export class ClosePosSessionDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDeclarationDto)
  paymentDeclarations?: PaymentDeclarationDto[];

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;
}
