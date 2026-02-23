import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { errOrderMessage } from 'src/libs/errors/error_order';
import { successOrderMessage } from 'src/libs/success/success_order';
import { Customer } from '../customers/entities/customer.entity';
import { ProductStock } from '../product-stocks/entities/product-stock.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Product } from '../products/entities/product.entity';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository;
  let productVariantRepository;
  let productRepository;
  let productStockRepository;
  let orderItemRepository;
  let customerRepository;
  let logger;

  const mockOrder = {
    id: 'order-id',
    order_id: 'ORDER-123',
    total_amount: 100,
    status: 'pending',
    items: [],
    branch: { id: 'branch-id' },
    user: { id: 'user-id' },
    customer: { id: 'customer-id' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProduct = {
    id: 'product-id',
    name_product: 'Test Product',
    price: 50,
  };

  const mockVariant = {
    id: 'variant-id',
    name_variant: 'Test Variant',
    price: 60,
    product: mockProduct,
    thumbnail: 'variant.jpg',
  };

  const mockOrderRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    manager: {
      transaction: jest.fn(),
    },
  };

  const mockProductVariantRepository = {
    find: jest.fn(),
  };

  const mockProductRepository = {
    find: jest.fn(),
  };

  const mockProductStockRepository = {
    find: jest.fn(),
  };

  const mockOrderItemRepository = {
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockCustomerRepository = {
    findOne: jest.fn(),
  };

  const mockLogger = {
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(ProductVariant),
          useValue: mockProductVariantRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: getRepositoryToken(ProductStock),
          useValue: mockProductStockRepository,
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: mockOrderItemRepository,
        },
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

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get(getRepositoryToken(Order));
    productVariantRepository = module.get(getRepositoryToken(ProductVariant));
    productRepository = module.get(getRepositoryToken(Product));
    productStockRepository = module.get(getRepositoryToken(ProductStock));
    orderItemRepository = module.get(getRepositoryToken(OrderItem));
    customerRepository = module.get(getRepositoryToken(Customer));
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createOrderDto = {
      items: [
        { productId: 'product-id', quantity: 1, price: 50 } as any,
        { variantId: 'variant-id', quantity: 1, price: 60 } as any,
      ],
      branch_id: 'branch-id',
      customer_id: 'customer-id',
      order_id: '',
      user_id: '',
      notes: '',
    };

    it('should create an order successfully', async () => {
      const mockManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === Order) return mockOrderRepository;
          if (entity === OrderItem) return mockOrderItemRepository;
          return {};
        }),
      };
      mockOrderRepository.manager.transaction.mockImplementation(async (cb) => {
        return cb(mockManager);
      });

      jest.spyOn(productRepository, 'find').mockResolvedValue([mockProduct]);
      jest
        .spyOn(productVariantRepository, 'find')
        .mockResolvedValue([mockVariant]);
      jest.spyOn(productStockRepository, 'find').mockResolvedValue([
        { product: { id: 'product-id' }, stock: 10, productVariant: null },
        { productVariant: { id: 'variant-id' }, stock: 10, product: null },
      ]);
      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue({ id: 'customer-id' });
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(orderRepository, 'create').mockReturnValue(mockOrder);
      jest.spyOn(orderRepository, 'save').mockResolvedValue(mockOrder);
      jest.spyOn(orderItemRepository, 'create').mockReturnValue({
        id: 'item-id',
        quantity: 1,
        price: 50,
        subtotal: 50,
        product: { id: 'product-id', name_product: 'Test Product' },
        variant: null,
      });
      jest.spyOn(orderItemRepository, 'save').mockResolvedValue({
        id: 'item-id',
        quantity: 1,
        price: 50,
        subtotal: 50,
        product: { id: 'product-id', name_product: 'Test Product' },
        variant: null,
      });

      const result = await service.create(createOrderDto, 'user-id');

      expect(result.message).toEqual(successOrderMessage.SUCCESS_CREATE_ORDER);
      expect(result.data.id).toEqual(mockOrder.id);
    });

    it('should throw error if product not found', async () => {
      jest.spyOn(productRepository, 'find').mockResolvedValue([]);
      jest
        .spyOn(productVariantRepository, 'find')
        .mockResolvedValue([mockVariant]);

      await expect(service.create(createOrderDto, 'user-id')).rejects.toThrow(
        new HttpException('Product not found', HttpStatus.BAD_REQUEST),
      );
    });
  });

  describe('findAll', () => {
    it('should return all orders', async () => {
      jest.spyOn(orderRepository, 'find').mockResolvedValue([mockOrder]);

      const result = await service.findAll('user-id');

      expect(result.message).toEqual(successOrderMessage.SUCCESS_GET_ORDERS);
      expect(result.datas.length).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return an order by id', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(mockOrder);

      const result = await service.findOne('order-id');

      expect(result.message).toEqual(successOrderMessage.SUCCESS_GET_ORDER);
      expect(result.data.id).toEqual(mockOrder.id);
    });

    it('should throw error if order not found', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        new HttpException(errOrderMessage.ERR_GET_ORDER, HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('remove', () => {
    it('should return remove message', () => {
      const expectedMessage = 'This action removes a #order-id order';
      const result = service.remove('order-id');
      expect(result).toEqual(expectedMessage);
    });
  });
});
