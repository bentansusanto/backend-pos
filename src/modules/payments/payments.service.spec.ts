import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { errorPaymentMessage } from 'src/libs/errors/error_payment';
import { successPaymentMessage } from 'src/libs/success/success_payment';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrdersService } from '../orders/orders.service';
import { ProductStock } from '../product-stocks/entities/product-stock.entity';
import { SalesReportsService } from '../sales-reports/sales-reports.service';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from './entities/payment.entity';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentRepository: any; // Type as any to easily mock manager
  let orderService: OrdersService;

  const mockOrder = {
    id: 'order-id',
    total_amount: 100,
    status: OrderStatus.PENDING,
    branch: { id: 'branch-id' },
    items: [],
  };

  const mockPayment = {
    id: 'payment-id',
    orderId: 'order-id',
    amount: 100,
    status: PaymentStatus.SUCCESS,
    method: PaymentMethod.CASH,
    paid_at: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaymentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    manager: {
      transaction: jest.fn(),
    },
    softDelete: jest.fn(),
  };

  const mockOrdersService = {
    findOne: jest.fn(),
  };

  const mockSalesReportsService = {
    // Add methods if needed
  };

  const mockLogger = {
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
        {
          provide: SalesReportsService,
          useValue: mockSalesReportsService,
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    paymentRepository = module.get(getRepositoryToken(Payment));
    orderService = module.get(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createPaymentDto = {
      orderId: 'order-id',
      method: PaymentMethod.CASH,
    };

    it('should create a payment successfully', async () => {
      jest
        .spyOn(orderService, 'findOne')
        .mockResolvedValue({ data: mockOrder } as any);
      jest
        .spyOn(paymentRepository, 'create')
        .mockReturnValue(mockPayment as any);
      jest
        .spyOn(paymentRepository, 'save')
        .mockResolvedValue(mockPayment as any);

      const result = await service.create(createPaymentDto);

      expect(result.message).toEqual(
        successPaymentMessage.SUCCESS_CREATE_PAYMENT,
      );
      expect(result.data.id).toEqual(mockPayment.id);
    });

    it('should throw error if order not found', async () => {
      jest.spyOn(orderService, 'findOne').mockResolvedValue(null);

      await expect(service.create(createPaymentDto)).rejects.toThrow(
        new HttpException('Order not found', HttpStatus.NOT_FOUND),
      );
    });

    it('should throw error if order status is not pending', async () => {
      jest.spyOn(orderService, 'findOne').mockResolvedValue({
        data: { ...mockOrder, status: OrderStatus.COMPLETED },
      } as any);

      await expect(service.create(createPaymentDto)).rejects.toThrow(
        new HttpException(
          'Order status is not pending',
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('findAll', () => {
    it('should return all payments', async () => {
      jest
        .spyOn(paymentRepository, 'find')
        .mockResolvedValue([mockPayment] as any);

      const result = await service.findAll();

      expect(result.message).toEqual(
        successPaymentMessage.SUCCESS_GET_PAYMENTS,
      );
      expect(result.datas.length).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a payment by id', async () => {
      jest
        .spyOn(paymentRepository, 'findOne')
        .mockResolvedValue(mockPayment as any);

      const result = await service.findOne('payment-id');

      expect(result.message).toEqual(successPaymentMessage.SUCCESS_GET_PAYMENT);
      expect(result.data.id).toEqual(mockPayment.id);
    });

    it('should throw error if payment not found', async () => {
      jest.spyOn(paymentRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        new HttpException(
          errorPaymentMessage.ERROR_GET_PAYMENT,
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('verifyPayment', () => {
    it('should verify payment successfully', async () => {
      // Mock transaction execution
      const mockManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === Payment)
            return {
              findOne: jest.fn().mockResolvedValue(mockPayment),
              save: jest.fn().mockResolvedValue(mockPayment),
            };
          if (entity === Order)
            return {
              findOne: jest.fn().mockResolvedValue(mockOrder),
              save: jest.fn().mockResolvedValue(mockOrder),
            };
          if (entity === ProductStock)
            return {
              findOne: jest.fn(),
              find: jest.fn().mockResolvedValue([]),
              save: jest.fn(),
            };
          if (entity === StockMovement)
            return { create: jest.fn(), save: jest.fn() };
          return {};
        }),
        save: jest.fn().mockResolvedValue(mockPayment),
      };

      mockPaymentRepository.manager.transaction.mockImplementation(
        async (cb) => {
          return cb(mockManager);
        },
      );

      // The actual service method returns a PaymentResponse, we check if transaction was called
      // and if it returns successfully.

      await service.verifyPayment('payment-id');
      expect(paymentRepository.manager.transaction).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a payment successfully', async () => {
      const expectedMessage = 'This action removes a #payment-id payment';

      const result = await service.remove('payment-id');

      expect(result).toEqual(expectedMessage);
    });
  });
});
