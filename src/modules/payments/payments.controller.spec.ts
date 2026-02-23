import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { successPaymentMessage } from 'src/libs/success/success_payment';
import { PaymentMethod } from './entities/payment.entity';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: PaymentsService;

  const mockPayment = {
    id: 'payment-id',
    orderId: 'order-id',
    amount: 100,
    status: 'SUCCESS',
    paymentMethod: 'CASH',
    paid_at: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaymentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    verifyPayment: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a payment', async () => {
      const createPaymentDto = {
        orderId: 'order-id',
        method: PaymentMethod.CASH,
      };

      jest.spyOn(service, 'create').mockResolvedValue({
        message: successPaymentMessage.SUCCESS_CREATE_PAYMENT,
        data: mockPayment,
      });

      const result = await controller.create(createPaymentDto);

      expect(result.message).toEqual(successPaymentMessage.SUCCESS_CREATE_PAYMENT);
      expect(result.data).toEqual(mockPayment);
      expect(service.create).toHaveBeenCalledWith(createPaymentDto);
    });
  });

  describe('findAll', () => {
    it('should return all payments', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue({
        message: successPaymentMessage.SUCCESS_GET_PAYMENTS,
        datas: [mockPayment],
      });

      const result = await controller.findAll();

      expect(result.message).toEqual(successPaymentMessage.SUCCESS_GET_PAYMENTS);
      expect(result.data).toEqual([mockPayment]);
    });
  });

  describe('findOne', () => {
    it('should return a payment by id', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        message: successPaymentMessage.SUCCESS_GET_PAYMENT,
        data: mockPayment,
      });

      const result = await controller.findOne('payment-id');

      expect(result.message).toEqual(successPaymentMessage.SUCCESS_GET_PAYMENT);
      expect(result.data).toEqual(mockPayment);
    });
  });

  describe('verifyPayment', () => {
    it('should verify a payment', async () => {
      jest.spyOn(service, 'verifyPayment').mockResolvedValue({
        message: successPaymentMessage.SUCCESS_PAYMENT,
        data: mockPayment,
      });

      const result = await controller.verifyPayment('payment-id');

      expect(result.message).toEqual(successPaymentMessage.SUCCESS_PAYMENT);
      expect(result.data).toEqual(mockPayment);
      expect(service.verifyPayment).toHaveBeenCalledWith('payment-id');
    });
  });

  describe('remove', () => {
    it('should remove a payment', async () => {
      const expectedMessage = 'This action removes a #payment-id payment';
      jest.spyOn(service, 'remove').mockReturnValue(expectedMessage);

      const result = await controller.remove('payment-id');

      expect(result).toEqual(expectedMessage);
    });
  });
});
