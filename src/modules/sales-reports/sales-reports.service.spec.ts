import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { SalesReportsService } from './sales-reports.service';

describe('SalesReportsService', () => {
  let service: SalesReportsService;
  let paymentRepository: any;
  let orderRepository: any;
  let logger: any;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  const mockPayment = {
    id: 'payment-id',
    orderId: 'order-id',
    amount: 100,
    status: 'success',
    method: 'cash',
    paid_at: new Date('2023-01-01'),
  };

  const mockOrder = {
    id: 'order-id',
    branch: { id: 'branch-id', name: 'Branch 1' },
    user: { id: 'user-id', name: 'Cashier 1' },
    customer: { id: 'customer-id', name: 'Customer 1' },
    items: [
      {
        product: { id: 'product-id', name_product: 'Product 1' },
        variant: null,
        quantity: 1,
        price: 100,
        subtotal: 100,
      },
    ],
    subtotal: 100,
    tax_amount: 10,
    discount_amount: 0,
  };

  beforeEach(async () => {
    paymentRepository = {
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };
    orderRepository = {
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };
    logger = {
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesReportsService,
        {
          provide: getRepositoryToken(Payment),
          useValue: paymentRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: orderRepository,
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: logger,
        },
      ],
    }).compile();

    service = module.get<SalesReportsService>(SalesReportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSalesReport', () => {
    it('should return sales report successfully', async () => {
      mockQueryBuilder.getMany.mockResolvedValueOnce([mockPayment]); // payments
      mockQueryBuilder.getMany.mockResolvedValueOnce([mockOrder]); // orders

      const result = await service.getSalesReport();

      expect(result).toHaveLength(1);
      expect(result[0].paymentId).toEqual(mockPayment.id);
      expect(result[0].orderId).toEqual(mockPayment.orderId);
      expect(result[0].totalAmount).toEqual(mockPayment.amount);
      expect(result[0].items).toHaveLength(1);
    });

    it('should apply filters correctly', async () => {
      mockQueryBuilder.getMany.mockResolvedValueOnce([mockPayment]);
      mockQueryBuilder.getMany.mockResolvedValueOnce([mockOrder]);

      await service.getSalesReport({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
        paymentMethod: 'cash',
        branchId: 'branch-id',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'payment.paid_at >= :startDate',
        expect.any(Object),
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'payment.paid_at <= :endDate',
        expect.any(Object),
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'payment.method = :paymentMethod',
        expect.any(Object),
      );
    });

    it('should handle errors', async () => {
      mockQueryBuilder.getMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getSalesReport()).rejects.toThrow(
        new HttpException(
          'Failed to get sales report',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('getSalesSummary', () => {
    it('should return sales summary successfully', async () => {
      mockQueryBuilder.getMany.mockResolvedValueOnce([mockPayment]); // payments
      mockQueryBuilder.getMany.mockResolvedValueOnce([mockOrder]); // orders

      const result = await service.getSalesSummary();

      expect(result.totalSales).toEqual(100);
      expect(result.totalTransactions).toEqual(1);
      expect(result.averageTransaction).toEqual(100);
      expect(result.totalCustomers).toEqual(1);
      expect(result.paymentMethodSummary).toEqual({ cash: 100 });
    });

    it('should handle errors', async () => {
      mockQueryBuilder.getMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getSalesSummary()).rejects.toThrow(
        new HttpException(
          'Failed to get sales report',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('getWeeklySalesReport', () => {
    it('should return weekly sales report successfully', async () => {
      mockQueryBuilder.getMany.mockResolvedValueOnce([mockPayment]); // payments
      mockQueryBuilder.getMany.mockResolvedValueOnce([mockOrder]); // orders

      const result = await service.getWeeklySalesReport('branch-id');

      expect(result.period).toEqual('weekly');
      expect(result.totalSales).toEqual(100);
      expect(result.dailySales).toHaveProperty('2023-01-01', 100);
    });

    it('should handle errors', async () => {
      mockQueryBuilder.getMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getWeeklySalesReport()).rejects.toThrow(
        new HttpException(
          'Failed to get sales report',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('getMonthlySalesReport', () => {
    it('should return monthly sales report successfully', async () => {
      mockQueryBuilder.getMany.mockResolvedValueOnce([mockPayment]); // payments
      mockQueryBuilder.getMany.mockResolvedValueOnce([mockOrder]); // orders

      const result = await service.getMonthlySalesReport('branch-id');

      expect(result.period).toEqual('monthly');
      expect(result.totalSales).toEqual(100);
      expect(result.dailySales).toHaveProperty('2023-01-01', 100);
    });

    it('should handle errors', async () => {
      mockQueryBuilder.getMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getMonthlySalesReport()).rejects.toThrow(
        new HttpException(
          'Failed to get sales report',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('getYearlySalesReport', () => {
    it('should return yearly sales report successfully', async () => {
      mockQueryBuilder.getMany.mockResolvedValueOnce([mockPayment]); // payments
      mockQueryBuilder.getMany.mockResolvedValueOnce([mockOrder]); // orders

      const result = await service.getYearlySalesReport('branch-id');

      expect(result.period).toEqual('yearly');
      expect(result.totalSales).toEqual(100);
      expect(result.monthlySales).toHaveProperty('2023-01', 100);
    });

    it('should handle errors', async () => {
      mockQueryBuilder.getMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getYearlySalesReport()).rejects.toThrow(
        new HttpException(
          'Failed to get sales report',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });
});
