import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { HttpException, HttpStatus } from '@nestjs/common';
import { errCustomerMessage } from 'src/libs/errors/error_customer';
import { successCustomerMessage } from 'src/libs/success/success_customer';

describe('CustomersService', () => {
  let service: CustomersService;
  let customerRepository;
  let logger;

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

  const mockCustomerRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockLogger = {
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getRepositoryToken(Customer),
          useValue: mockCustomerRepository,
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    customerRepository = module.get(getRepositoryToken(Customer));
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createCustomerDto = {
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '1234567890',
      address: 'Test Address',
      city: 'Test City',
      country: 'Test Country',
    };

    it('should create a customer successfully', async () => {
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(customerRepository, 'create').mockReturnValue(mockCustomer);
      jest.spyOn(customerRepository, 'save').mockResolvedValue(mockCustomer);

      const result = await service.create(createCustomerDto);

      expect(result.message).toEqual(
        successCustomerMessage.SUCCESS_CUSTOMER_CREATE,
      );
      expect(result.data.id).toEqual(mockCustomer.id);
      expect(customerRepository.create).toHaveBeenCalledWith(createCustomerDto);
    });

    it('should throw error if customer email already exists', async () => {
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(mockCustomer);

      await expect(service.create(createCustomerDto)).rejects.toThrow(
        new HttpException(
          errCustomerMessage.ERR_CUSTOMER_ALREADY_EXISTS,
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('findAll', () => {
    it('should return all customers', async () => {
      jest.spyOn(customerRepository, 'find').mockResolvedValue([mockCustomer]);

      const result = await service.findAll();

      expect(result.message).toEqual(
        successCustomerMessage.SUCCESS_CUSTOMER_FIND_ALL,
      );
      expect(result.datas.length).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a customer by id', async () => {
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(mockCustomer);

      const result = await service.findOne('customer-id');

      expect(result.message).toEqual(
        successCustomerMessage.SUCCESS_CUSTOMER_FIND_ID,
      );
      expect(result.data.id).toEqual(mockCustomer.id);
    });

    it('should throw error if customer not found', async () => {
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        new HttpException(
          errCustomerMessage.ERR_CUSTOMER_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('update', () => {
    const updateCustomerDto = {
      name: 'Updated Customer',
    };

    it('should update a customer successfully', async () => {
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(mockCustomer);
      jest
        .spyOn(customerRepository, 'update')
        .mockResolvedValue({ affected: 1 });

      const result = await service.update('customer-id', updateCustomerDto);

      expect(result.message).toEqual(
        successCustomerMessage.SUCCESS_CUSTOMER_UPDATE,
      );
      expect(result.data.id).toEqual(mockCustomer.id);
    });

    it('should throw error if customer not found for update', async () => {
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.update('invalid-id', updateCustomerDto),
      ).rejects.toThrow(
        new HttpException(
          errCustomerMessage.ERR_CUSTOMER_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('remove', () => {
    it('should remove a customer successfully', async () => {
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(mockCustomer);
      jest
        .spyOn(customerRepository, 'softDelete')
        .mockResolvedValue({ affected: 1 });

      const result = await service.remove('customer-id');

      expect(result.message).toEqual(
        successCustomerMessage.SUCCESS_CUSTOMER_REMOVE,
      );
    });

    it('should throw error if customer not found for deletion', async () => {
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(
        new HttpException(
          errCustomerMessage.ERR_CUSTOMER_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });
});
