import { Test, TestingModule } from '@nestjs/testing';
import { SalesReportsController } from './sales-reports.controller';
import { SalesReportsService } from './sales-reports.service';

describe('SalesReportsController', () => {
  let controller: SalesReportsController;
  let service: SalesReportsService;

  const mockSalesReportsService = {
    getWeeklySalesReport: jest.fn(),
    getMonthlySalesReport: jest.fn(),
    getYearlySalesReport: jest.fn(),
    getSalesReport: jest.fn(),
    getSalesSummary: jest.fn(),
  };

  const mockReport = {
    period: 'weekly',
    totalSales: 100,
    dailySales: { '2023-01-01': 100 },
  };

  const mockSummary = {
    totalSales: 100,
    totalTransactions: 1,
    averageTransaction: 100,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesReportsController],
      providers: [
        {
          provide: SalesReportsService,
          useValue: mockSalesReportsService,
        },
      ],
    }).compile();

    controller = module.get<SalesReportsController>(SalesReportsController);
    service = module.get<SalesReportsService>(SalesReportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getWeeklyReport', () => {
    it('should return weekly report', async () => {
      mockSalesReportsService.getWeeklySalesReport.mockResolvedValue(
        mockReport,
      );
      const result = await controller.getWeeklyReport('branch-id');
      expect(result).toEqual(mockReport);
      expect(service.getWeeklySalesReport).toHaveBeenCalledWith('branch-id');
    });
  });

  describe('getMonthlyReport', () => {
    it('should return monthly report', async () => {
      mockSalesReportsService.getMonthlySalesReport.mockResolvedValue(
        mockReport,
      );
      const result = await controller.getMonthlyReport('branch-id');
      expect(result).toEqual(mockReport);
      expect(service.getMonthlySalesReport).toHaveBeenCalledWith('branch-id');
    });
  });

  describe('getYearlyReport', () => {
    it('should return yearly report', async () => {
      mockSalesReportsService.getYearlySalesReport.mockResolvedValue(
        mockReport,
      );
      const result = await controller.getYearlyReport('branch-id');
      expect(result).toEqual(mockReport);
      expect(service.getYearlySalesReport).toHaveBeenCalledWith('branch-id');
    });
  });

  describe('getSalesReport', () => {
    it('should return sales report with filters', async () => {
      mockSalesReportsService.getSalesReport.mockResolvedValue([mockReport]);
      const result = await controller.getSalesReport(
        '2023-01-01',
        '2023-01-31',
        'branch-id',
        'cash',
      );
      expect(result).toEqual([mockReport]);
      expect(service.getSalesReport).toHaveBeenCalledWith({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
        branchId: 'branch-id',
        paymentMethod: 'cash',
      });
    });
  });

  describe('getSalesSummary', () => {
    it('should return sales summary with filters', async () => {
      mockSalesReportsService.getSalesSummary.mockResolvedValue(mockSummary);
      const result = await controller.getSalesSummary(
        '2023-01-01',
        '2023-01-31',
        'branch-id',
      );
      expect(result).toEqual(mockSummary);
      expect(service.getSalesSummary).toHaveBeenCalledWith({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
        branchId: 'branch-id',
      });
    });
  });
});
