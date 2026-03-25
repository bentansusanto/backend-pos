import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { Permissions } from 'src/common/decorator/permissions.decorator';
import { CurrentBranchId } from 'src/common/decorator/branch.decorator';
import { SalesReportsService } from './sales-reports.service';

@Controller('sales-reports')
export class SalesReportsController {
  constructor(private readonly salesReportsService: SalesReportsService) {}

  @Get('weekly')
  async getWeeklyReport(
    @Query('branchId') queryBranchId?: string,
    @CurrentBranchId() headerBranchId?: string,
  ) {
    const branchId = queryBranchId || headerBranchId;
    return this.salesReportsService.getWeeklySalesReport(branchId);
  }

  @Get('monthly')
  async getMonthlyReport(
    @Query('branchId') queryBranchId?: string,
    @CurrentBranchId() headerBranchId?: string,
  ) {
    const branchId = queryBranchId || headerBranchId;
    return this.salesReportsService.getMonthlySalesReport(branchId);
  }

  @Get('yearly')
  async getYearlyReport(
    @Query('branchId') queryBranchId?: string,
    @CurrentBranchId() headerBranchId?: string,
  ) {
    const branchId = queryBranchId || headerBranchId;
    return this.salesReportsService.getYearlySalesReport(branchId);
  }

  @Get()
  async getSalesReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('branchId') queryBranchId?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @CurrentBranchId() headerBranchId?: string,
  ) {
    const branchId = queryBranchId || headerBranchId;
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
    @Query('branchId') queryBranchId?: string,
    @CurrentBranchId() headerBranchId?: string,
  ) {
    const branchId = queryBranchId || headerBranchId;
    return this.salesReportsService.getSalesSummary({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      branchId,
    });
  }

  @Permissions('sales_reports:exportExcel')
  @Get('export/excel')
  async exportExcel(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('branchId') queryBranchId: string,
    @CurrentBranchId() headerBranchId: string,
    @Res() res: Response,
  ) {
    const branchId = queryBranchId || headerBranchId;
    const workbook = await this.salesReportsService.exportSalesToExcel({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      branchId,
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=sales-report.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  @Permissions('sales_reports:exportPdf')
  @Get('export/pdf')
  async exportPdf(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('branchId') queryBranchId: string,
    @CurrentBranchId() headerBranchId: string,
    @Res() res: Response,
  ) {
    const branchId = queryBranchId || headerBranchId;
    const pdfDoc = await this.salesReportsService.exportSalesToPdf({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      branchId,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');

    pdfDoc.pipe(res);
    pdfDoc.end();
  }
}
