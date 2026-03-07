import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Supplier } from './entities/supplier.entity';
import { SupplierService } from './supplier.service';

const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
};

const mockSupplier = {
  id: 'sup-001',
  name: 'PT Sumber Makmur',
  email: 'supplier@example.com',
  phone: '081234567890',
  address: 'Jakarta',
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

describe('SupplierService', () => {
  let service: SupplierService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierService,
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: mockLogger },
        { provide: getRepositoryToken(Supplier), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<SupplierService>(SupplierService);
    repo = module.get(getRepositoryToken(Supplier));
  });

  afterEach(() => jest.clearAllMocks());

  // ── create ────────────────────────────────────────────────────────────────
  describe('create()', () => {
    const dto = {
      name: 'PT Sumber Makmur',
      email: 'supplier@example.com',
      phone: '081234567890',
      address: 'Jakarta',
    };

    it('creates a supplier successfully', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(mockSupplier);
      repo.save.mockResolvedValue(mockSupplier);

      const result = await service.create(dto as any);

      expect(repo.save).toHaveBeenCalled();
      expect(result.message).toBeDefined();
    });

    it('throws 400 when email already exists', async () => {
      repo.findOne.mockResolvedValue(mockSupplier);

      await expect(service.create(dto as any)).rejects.toThrow(HttpException);
      await expect(service.create(dto as any)).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
      });
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────
  describe('findAll()', () => {
    it('returns list of suppliers', async () => {
      repo.find.mockResolvedValue([mockSupplier]);

      const result = await service.findAll();

      expect(result.datas).toHaveLength(1);
      expect(result.datas[0]).toMatchObject({
        id: 'sup-001',
        name: 'PT Sumber Makmur',
      });
    });

    it('throws when no suppliers exist', async () => {
      repo.find.mockResolvedValue([]);

      await expect(service.findAll()).rejects.toThrow();
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────
  describe('findOne()', () => {
    it('returns supplier by id', async () => {
      repo.findOne.mockResolvedValue(mockSupplier);

      const result = await service.findOne('sup-001');

      expect(result.data).toMatchObject({
        id: 'sup-001',
        email: 'supplier@example.com',
      });
    });

    it('throws NotFoundException when supplier not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne('x')).rejects.toThrow();
    });
  });

  // ── update ────────────────────────────────────────────────────────────────
  describe('update()', () => {
    it('updates supplier and returns updated data', async () => {
      repo.findOne.mockResolvedValue(mockSupplier);
      repo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.update('sup-001', {
        name: 'PT Baru',
      } as any);

      expect(repo.update).toHaveBeenCalledWith('sup-001', { name: 'PT Baru' });
      expect(result.message).toBeDefined();
    });

    it('throws when supplier not found for update', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.update('x', {} as any)).rejects.toThrow();
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────
  describe('remove()', () => {
    it('soft-deletes supplier', async () => {
      repo.findOne.mockResolvedValue(mockSupplier);
      repo.softDelete.mockResolvedValue({ affected: 1 } as any);

      const result = await service.remove('sup-001');

      expect(repo.softDelete).toHaveBeenCalledWith('sup-001');
      expect(result.message).toBeDefined();
    });

    it('throws when supplier not found for delete', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove('x')).rejects.toThrow();
    });
  });
});
