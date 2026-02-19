import { Controller, Get, Query } from '@nestjs/common';
import { SalesReportsService } from './sales-reports.service';

@Controller('sales-reports')
export class SalesReportsController {
  constructor(private readonly salesReportsService: SalesReportsService) {}

  @Get('weekly')
  async getWeeklyReport(@Query('branchId') branchId?: string) {
    return this.salesReportsService.getWeeklySalesReport(branchId);
  }

  @Get('monthly')
  async getMonthlyReport(@Query('branchId') branchId?: string) {
    return this.salesReportsService.getMonthlySalesReport(branchId);
  }

  @Get('yearly')
  async getYearlyReport(@Query('branchId') branchId?: string) {
    return this.salesReportsService.getYearlySalesReport(branchId);
  }

  @Get()
  async getSalesReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('branchId') branchId?: string,
    @Query('paymentMethod') paymentMethod?: string,
  ) {
    return this.salesReportsService.getSalesReport({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      branchId,
      paymentMethod,
    });
  }

  @Get('summary')
  async getSalesSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.salesReportsService.getSalesSummary({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      branchId,
    });
  }
}
