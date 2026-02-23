import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { successCustomerMessage } from 'src/libs/success/success_customer';

describe('CustomersController', () => {
  let controller: CustomersController;
  let service: CustomersService;

  const mockCustomer = {
    id: 'customer-id',
    name: 'Test Customer',
    email: 'test@example.com',
    phone: '1234567890',
    address: 'Test Address',
    city: 'Test City',
    country: 'Test Country',
    loyalPoints: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCustomersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        {
          provide: CustomersService,
          useValue: mockCustomersService,
        },
      ],
    }).compile();

    controller = module.get<CustomersController>(CustomersController);
    service = module.get<CustomersService>(CustomersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a customer', async () => {
      const createCustomerDto = {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '1234567890',
        address: 'Test Address',
        city: 'Test City',
        country: 'Test Country',
      };

      jest.spyOn(service, 'create').mockResolvedValue({
        message: successCustomerMessage.SUCCESS_CUSTOMER_CREATE,
        data: mockCustomer,
      });

      const result = await controller.create(createCustomerDto);

      expect(result.message).toEqual(successCustomerMessage.SUCCESS_CUSTOMER_CREATE);
      expect(result.data).toEqual(mockCustomer);
      expect(service.create).toHaveBeenCalledWith(createCustomerDto);
    });
  });

  describe('findAll', () => {
    it('should return all customers', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue({
        message: successCustomerMessage.SUCCESS_CUSTOMER_FIND_ALL,
        datas: [mockCustomer],
      });

      const result = await controller.findAll();

      expect(result.message).toEqual(successCustomerMessage.SUCCESS_CUSTOMER_FIND_ALL);
      expect(result.data).toEqual([mockCustomer]);
    });
  });

  describe('findOne', () => {
    it('should return a customer by id', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        message: successCustomerMessage.SUCCESS_CUSTOMER_FIND_ID,
        data: mockCustomer,
      });

      const result = await controller.findOne('customer-id');

      expect(result.message).toEqual(successCustomerMessage.SUCCESS_CUSTOMER_FIND_ID);
      expect(result.data).toEqual(mockCustomer);
    });
  });

  describe('update', () => {
    it('should update a customer', async () => {
      const updateCustomerDto = { name: 'Updated Customer' };

      jest.spyOn(service, 'update').mockResolvedValue({
        message: successCustomerMessage.SUCCESS_CUSTOMER_UPDATE,
        data: mockCustomer,
      });

      const result = await controller.update('customer-id', updateCustomerDto);

      expect(result.message).toEqual(successCustomerMessage.SUCCESS_CUSTOMER_UPDATE);
      expect(result.data).toEqual(mockCustomer);
      expect(service.update).toHaveBeenCalledWith('customer-id', updateCustomerDto);
    });
  });

  describe('remove', () => {
    it('should remove a customer', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue({
        message: successCustomerMessage.SUCCESS_CUSTOMER_REMOVE,
      });

      const result = await controller.remove('customer-id');

      expect(result.message).toEqual(successCustomerMessage.SUCCESS_CUSTOMER_REMOVE);
    });
  });
});
