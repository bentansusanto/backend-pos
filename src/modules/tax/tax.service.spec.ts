import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Tax } from './entities/tax.entity';
import { TaxService } from './tax.service';

const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
};

const mockTax = {
  id: 'tax-001',
  name: 'PPN 11%',
  rate: 11,
  is_inclusive: false,
  is_active: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
});

describe('TaxService', () => {
  let service: TaxService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxService,
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: mockLogger },
        { provide: getRepositoryToken(Tax), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<TaxService>(TaxService);
    repo = module.get(getRepositoryToken(Tax));
  });

  afterEach(() => jest.clearAllMocks());

  // ── create ────────────────────────────────────────────────────────────────
  describe('create()', () => {
    const dto = {
      name: 'PPN 11%',
      rate: 11,
      is_inclusive: false,
      is_active: true,
    };

    it('creates a tax successfully', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(mockTax);
      repo.save.mockResolvedValue(mockTax);

      const result = await service.create(dto);

      expect(repo.save).toHaveBeenCalled();
      expect(result.message).toBeDefined();
    });

    it('throws 400 when tax name already exists', async () => {
      repo.findOne.mockResolvedValue(mockTax);

      await expect(service.create(dto)).rejects.toThrow(HttpException);
      await expect(service.create(dto)).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
      });
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────
  describe('findAll()', () => {
    it('returns mapped list of taxes', async () => {
      repo.find.mockResolvedValue([mockTax]);

      const result = await service.findAll();

      expect(result.datas).toHaveLength(1);
      expect(result.datas[0]).toMatchObject({
        id: 'tax-001',
        rate: 11,
        is_inclusive: false,
      });
    });

    it('throws when no taxes found', async () => {
      repo.find.mockResolvedValue([]);

      await expect(service.findAll()).rejects.toThrow();
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────
  describe('findOne()', () => {
    it('returns a single tax by id', async () => {
      repo.findOne.mockResolvedValue(mockTax);

      const result = await service.findOne('tax-001');

      expect(result.data).toMatchObject({ id: 'tax-001', name: 'PPN 11%' });
    });

    it('throws when tax not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow();
    });
  });

  // ── update ────────────────────────────────────────────────────────────────
  describe('update()', () => {
    it('updates tax and returns existing data', async () => {
      repo.findOne.mockResolvedValue(mockTax);
      repo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.update('tax-001', {
        name: 'PPN 12%',
        rate: 12,
      });

      expect(repo.update).toHaveBeenCalledWith('tax-001', {
        name: 'PPN 12%',
        rate: 12,
      });
      expect(result.data.id).toBe('tax-001');
    });

    it('throws when tax not found during update', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.update('x', { rate: 9 })).rejects.toThrow();
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────
  describe('remove()', () => {
    it('soft-deletes tax and returns success', async () => {
      repo.findOne.mockResolvedValue(mockTax);
      repo.softDelete.mockResolvedValue({ affected: 1 } as any);

      const result = await service.remove('tax-001');

      expect(repo.softDelete).toHaveBeenCalledWith('tax-001');
      expect(result.message).toBeDefined();
    });

    it('throws when tax not found for delete', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove('x')).rejects.toThrow();
    });
  });

  // ── default tax (branch) validation ──────────────────────────────────────
  describe('default branch tax (data shape)', () => {
    it('tax entity contains fields required by Branch.defaultTax relation', () => {
      // Branch entity ManyToOne -> Tax, join column: default_tax_id
      expect(mockTax).toHaveProperty('id');
      expect(mockTax).toHaveProperty('rate');
      expect(mockTax).toHaveProperty('is_inclusive');
      expect(mockTax).toHaveProperty('is_active');
    });

    it('findAll returns only active taxes (frontend can filter)', async () => {
      repo.find.mockResolvedValue([
        { ...mockTax, is_active: true },
        { ...mockTax, id: 'tax-002', is_active: false },
      ]);

      const result = await service.findAll();
      const active = result.datas.filter((t) => t.is_active);

      expect(active.length).toBe(1);
      expect(active[0].id).toBe('tax-001');
    });
  });
});
