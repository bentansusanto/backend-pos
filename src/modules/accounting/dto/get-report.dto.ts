import { IsDateString, IsOptional, IsString } from 'class-validator';

export class GetReportDto {
  @IsString()
  @IsOptional()
  branchId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
