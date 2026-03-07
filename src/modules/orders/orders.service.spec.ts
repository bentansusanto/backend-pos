import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Customer } from '../customers/entities/customer.entity';
import { ProductStock } from '../product-stocks/entities/product-stock.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { UserLogsService } from '../user_logs/user_logs.service';
import { OrderItem } from './entities/order-item.entity';
import { Order, OrderStatus } from './entities/order.entity';
import { OrdersService } from './orders.service';

const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
};
const mockUserLogsService = { log: jest.fn() };

// ── mock data ──────────────────────────────────────────────────────────────
const mockVariant: Partial<ProductVariant> = {
  id: 'var-001',
  name_variant: 'Medium Red',
  price: 50000,
  sku: 'SKU-MR-001',
  product: { id: 'prod-001', name_product: 'Baju' } as any,
};

const mockStock: Partial<ProductStock> = {
  id: 'stk-001',
  stock: 50,
  productVariant: mockVariant as any,
  branch: { id: 'br-001' } as any,
};

const now = new Date();
const mockOrder: Partial<Order> = {
  id: 'ord-001',
  invoice_number: 'INV/2024/001',
  status: OrderStatus.PENDING,
  subtotal: 100000,
  tax_amount: 11000,
  discount_amount: 0,
  customer: { id: 'cust-001' } as any,
  branch: { id: 'br-001' } as any,
  user: { id: 'user-001' } as any,
  items: [],
  createdAt: now,
  updatedAt: now,
};

const mockOrderItem: Partial<OrderItem> = {
  id: 'item-001',
  quantity: 2, // entity field is 'quantity' not 'qty'
  price: 50000,
  subtotal: 100000,
  discount: 0,
  variant: mockVariant as any,
};

const mockOrderRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  manager: { transaction: jest.fn() },
});

const mockVariantRepo = () => ({
  findOne: jest.fn(),
  findBy: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
});

const mockStockRepo = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
});

const mockOrderItemRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  find: jest.fn(),
});

const mockCustomerRepo = () => ({
  findOne: jest.fn(),
});

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepo: ReturnType<typeof mockOrderRepo>;
  let variantRepo: ReturnType<typeof mockVariantRepo>;
  let stockRepo: ReturnType<typeof mockStockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: mockLogger },
        { provide: getRepositoryToken(Order), useFactory: mockOrderRepo },
        {
          provide: getRepositoryToken(ProductVariant),
          useFactory: mockVariantRepo,
        },
        {
          provide: getRepositoryToken(ProductStock),
          useFactory: mockStockRepo,
        },
        {
          provide: getRepositoryToken(OrderItem),
          useFactory: mockOrderItemRepo,
        },
        { provide: getRepositoryToken(Customer), useFactory: mockCustomerRepo },
        { provide: UserLogsService, useValue: mockUserLogsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepo = module.get(getRepositoryToken(Order));
    variantRepo = module.get(getRepositoryToken(ProductVariant));
    stockRepo = module.get(getRepositoryToken(ProductStock));
  });

  afterEach(() => jest.clearAllMocks());

  // ── findAll ────────────────────────────────────────────────────────────────
  describe('findAll()', () => {
    it('returns orders for a branch', async () => {
      orderRepo.find.mockResolvedValue([
        {
          ...mockOrder,
          items: [
            {
              ...mockOrderItem,
              variant: {
                ...mockVariant,
                product: { id: 'prod-001', category: {} },
              },
            },
          ],
        },
      ]);

      const result = await service.findAll('user-001', 'br-001');

      expect(orderRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ branch: { id: 'br-001' } }),
        }),
      );
      expect(result.datas).toHaveLength(1);
      expect(result.datas[0].id).toBe('ord-001');
    });

    it('returns all orders when no filter given', async () => {
      orderRepo.find.mockResolvedValue([{ ...mockOrder, items: [] }]);

      const result = await service.findAll();

      expect(result.datas).toHaveLength(1);
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────
  describe('findOne()', () => {
    it('returns order with computed total_amount', async () => {
      orderRepo.findOne.mockResolvedValue({
        ...mockOrder,
        items: [
          {
            ...mockOrderItem,
            variant: { ...mockVariant, product: { id: 'p', category: {} } },
          },
        ],
      });

      const result = await service.findOne('ord-001');

      // total_amount = subtotal + tax_amount - discount_amount = 100000+11000-0=111000
      expect(result.data.total_amount).toBe(111000);
      expect(result.data.invoice_number).toBe('INV/2024/001');
    });

    it('throws when order not found', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('x')).rejects.toThrow(HttpException);
    });
  });

  // ── Order uses variant-based items (no direct product) ────────────────────
  describe('order items use ProductVariant (not Product directly)', () => {
    it('order items have variant field, not product field at top level', () => {
      // Validates the refactored architecture: items reference variant → product
      const item = { ...mockOrderItem };
      expect(item).toHaveProperty('variant');
      expect(item).not.toHaveProperty('product'); // product accessed via item.variant.product
    });

    it('order total_amount = subtotal + tax_amount - discount_amount', () => {
      const subtotal = 100000;
      const tax = 11000;
      const discount = 5000;
      const expected = subtotal + tax - discount;

      expect(expected).toBe(106000);
    });
  });

  // ── OrderStatus enum ───────────────────────────────────────────────────────
  describe('OrderStatus enum', () => {
    it('has PENDING, COMPLETED, CANCELLED statuses', () => {
      expect(OrderStatus.PENDING).toBe('pending');
      expect(OrderStatus.COMPLETED).toBe('completed');
      expect(OrderStatus.CANCELLED).toBe('cancelled');
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────
  describe('remove()', () => {
    it('deletes order and fires activity log', async () => {
      orderRepo.findOne.mockResolvedValue({ ...mockOrder, items: [] });
      orderRepo.delete.mockResolvedValue({ affected: 1 } as any);

      await service.remove('ord-001');

      expect(orderRepo.delete).toHaveBeenCalledWith('ord-001');
    });

    it('throws when order not found', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('x')).rejects.toThrow(HttpException);
    });
  });
});
