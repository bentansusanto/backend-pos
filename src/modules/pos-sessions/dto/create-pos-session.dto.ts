import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

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

export class ClosePosSessionDto {
  @IsNotEmpty({ message: 'Closing balance is required' })
  @IsNumber({}, { message: 'Closing balance must be a number' })
  closingBalance: number;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;
}
