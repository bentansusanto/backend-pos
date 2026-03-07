import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { BranchesService } from '../branches/branches.service';
import { ProductVariantsService } from '../products/product-variants/product-variants.service';
import { ReferenceType } from '../stock-movements/entities/stock-movement.entity';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { UserLogsService } from '../user_logs/user_logs.service';
import { ProductStock } from './entities/product-stock.entity';
import { ProductStocksService } from './product-stocks.service';

const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
};

const mockBranch = { data: { id: 'br-001', name: 'Main Branch' } };
const mockVariant = {
  data: { id: 'var-001', name_variant: 'Default', sku: 'SKU-001' },
};

const mockProductStock = {
  id: 'stock-001',
  stock: 100,
  minStock: 10,
  branch: { id: 'br-001' },
  productVariant: { id: 'var-001' },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockBranchService = { findOne: jest.fn() };
const mockVariantService = { findOne: jest.fn() };
const mockStockMovementsService = { create: jest.fn() };
const mockUserLogsService = { log: jest.fn() };

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  delete: jest.fn(),
});

describe('ProductStocksService', () => {
  let service: ProductStocksService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductStocksService,
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: mockLogger },
        { provide: getRepositoryToken(ProductStock), useFactory: mockRepo },
        { provide: BranchesService, useValue: mockBranchService },
        { provide: ProductVariantsService, useValue: mockVariantService },
        { provide: StockMovementsService, useValue: mockStockMovementsService },
        { provide: UserLogsService, useValue: mockUserLogsService },
      ],
    }).compile();

    service = module.get<ProductStocksService>(ProductStocksService);
    repo = module.get(getRepositoryToken(ProductStock));
  });

  afterEach(() => jest.clearAllMocks());

  // ── create ────────────────────────────────────────────────────────────────
  describe('create()', () => {
    const dto = {
      branchId: 'br-001',
      variantId: 'var-001',
      stock: 100,
      minStock: 10,
    };

    it('creates product stock linked to variant (not product directly)', async () => {
      mockBranchService.findOne.mockResolvedValue(mockBranch);
      mockVariantService.findOne.mockResolvedValue(mockVariant);
      repo.findOne.mockResolvedValue(null); // no existing stock
      repo.create.mockReturnValue(mockProductStock);
      repo.save.mockResolvedValue(mockProductStock);
      mockStockMovementsService.create.mockResolvedValue({});

      const result = await service.create(dto as any, 'user-001');

      expect(mockBranchService.findOne).toHaveBeenCalledWith('br-001');
      expect(mockVariantService.findOne).toHaveBeenCalled();
      // Stock movement created as ADJUST type
      expect(mockStockMovementsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          referenceType: ReferenceType.ADJUST,
          qty: 100,
        }),
      );
      expect(result.data).toBeDefined();
      expect(result.data).not.toHaveProperty('productId'); // OLD field removed
    });

    it('throws when branch not found', async () => {
      mockBranchService.findOne.mockRejectedValue(
        new HttpException('Not found', 404),
      );

      await expect(service.create(dto as any, 'user-001')).rejects.toThrow();
    });

    it('throws when variant not found', async () => {
      mockBranchService.findOne.mockResolvedValue(mockBranch);
      mockVariantService.findOne.mockRejectedValue(
        new HttpException('Not found', 404),
      );

      await expect(service.create(dto as any, 'user-001')).rejects.toThrow();
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────
  describe('findAll()', () => {
    it('returns all product stocks with variant and branch data', async () => {
      repo.find.mockResolvedValue([mockProductStock]);

      const result = await service.findAll('br-001');

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { branch: { id: 'br-001' } } }),
      );
      expect(result.datas).toHaveLength(1);
      // variantId should be present, no productId (removed from response)
      expect(result.datas[0].variantId).toBeDefined();
    });

    it('returns stocks for all branches when no branchId given', async () => {
      repo.find.mockResolvedValue([mockProductStock]);

      await service.findAll();

      // No branchId → where is undefined (not {})
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────
  describe('findOne()', () => {
    it('returns stock by id with variant relation', async () => {
      repo.findOne.mockResolvedValue(mockProductStock);

      const result = await service.findOne('stock-001');

      expect(repo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'stock-001' },
          relations: expect.arrayContaining(['productVariant', 'branch']),
        }),
      );
      expect(result.data.variantId).toBe('var-001');
    });

    it('throws when stock not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne('x')).rejects.toThrow();
    });
  });

  // ── update ────────────────────────────────────────────────────────────────
  describe('update()', () => {
    it('updates stock quantity', async () => {
      repo.findOne.mockResolvedValue(mockProductStock);
      repo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.update(
        'stock-001',
        { stock: 200 } as any,
        'user-001',
      );

      expect(repo.update).toHaveBeenCalled();
      expect(result.data).toBeDefined();
    });

    it('throws when stock record not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.update('x', { stock: 100 } as any, 'user-001'),
      ).rejects.toThrow();
    });
  });
});
