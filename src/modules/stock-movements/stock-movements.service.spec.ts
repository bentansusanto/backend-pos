import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReferenceType, StockMovement } from './entities/stock-movement.entity';
import { StockMovementsService } from './stock-movements.service';

const mockMovement: Partial<StockMovement> = {
  id: 'mv-001',
  referenceType: ReferenceType.ADJUST,
  qty: 10,
  referenceId: 'ref-001',
  productVariant: { id: 'var-001' } as any,
  branch: { id: 'br-001' } as any,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
});

describe('StockMovementsService', () => {
  let service: StockMovementsService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockMovementsService,
        { provide: getRepositoryToken(StockMovement), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<StockMovementsService>(StockMovementsService);
    repo = module.get(getRepositoryToken(StockMovement));
  });

  afterEach(() => jest.clearAllMocks());

  // ── create ────────────────────────────────────────────────────────────────
  describe('create()', () => {
    it('creates stock movement linked to variant (not product) and branch', async () => {
      repo.create.mockReturnValue(mockMovement);
      repo.save.mockResolvedValue(mockMovement);

      const dto = {
        variantId: 'var-001',
        branchId: 'br-001',
        referenceType: ReferenceType.ADJUST,
        qty: 10,
        referenceId: 'ref-001',
      };

      const result = await service.create(dto as any);

      // Confirms product is NOT passed — only variant
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          productVariant: { id: 'var-001' },
          branch: { id: 'br-001' },
        }),
      );
      // Confirms productId is NOT in the entity call
      expect(repo.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ product: expect.anything() }),
      );
      expect(result).toBeDefined();
    });

    it('creates movement without variant when variantId is null', async () => {
      const partial = { ...mockMovement, productVariant: undefined };
      repo.create.mockReturnValue(partial);
      repo.save.mockResolvedValue(partial);

      await service.create({
        variantId: null,
        branchId: 'br-001',
        referenceType: ReferenceType.PURCHASE,
        qty: 5,
        referenceId: 'ref-002',
      } as any);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ productVariant: undefined }),
      );
    });

    it('throws NotFoundException on failure', async () => {
      repo.create.mockImplementation(() => {
        throw new Error('DB error');
      });

      await expect(
        service.create({
          variantId: 'v',
          branchId: 'b',
          referenceType: ReferenceType.SALE,
          qty: 1,
          referenceId: 'r',
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────
  describe('findAll()', () => {
    it('returns all stock movements ordered by createdAt DESC', async () => {
      repo.find.mockResolvedValue([mockMovement]);

      const result = await service.findAll();

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { createdAt: 'DESC' } }),
      );
      expect(result).toHaveLength(1);
    });

    it('filters by branchId when provided', async () => {
      repo.find.mockResolvedValue([mockMovement]);

      await service.findAll('br-001');

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { branch: { id: 'br-001' } } }),
      );
    });

    it('returns all movements when no branchId provided', async () => {
      repo.find.mockResolvedValue([mockMovement]);

      await service.findAll();

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────
  describe('findOne()', () => {
    it('returns a movement by id with relations', async () => {
      repo.findOne.mockResolvedValue(mockMovement);

      const result = await service.findOne('mv-001');

      expect(repo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'mv-001' },
          relations: ['productVariant', 'branch'],
        }),
      );
      expect(result).toBeDefined();
    });

    it('throws NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne('bad')).rejects.toThrow(NotFoundException);
    });
  });

  // ── ReferenceType enum coverage ───────────────────────────────────────────
  describe('ReferenceType enum', () => {
    it('has all expected reference types', () => {
      expect(ReferenceType.SALE).toBe('sale');
      expect(ReferenceType.PURCHASE).toBe('purchase');
      expect(ReferenceType.ADJUST).toBe('adjust');
      expect(ReferenceType.RETURN_SALE).toBe('return_sale');
      expect(ReferenceType.RETURN_PURCHASE).toBe('return_purchase');
      expect(ReferenceType.EXPIRED).toBe('expired');
      expect(ReferenceType.DAMAGE).toBe('damage');
      expect(ReferenceType.OPENING_STOCK).toBe('opening_stock');
    });
  });
});
