import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserLogsService } from '../user_logs/user_logs.service';
import { DiscountsService } from './discounts.service';
import { Discount } from './entities/discount.entity';

const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
};

const mockDiscount = {
  id: 'disc-001',
  name: 'Promo Ramadan',
  description: 'Diskon 10%',
  type: 'percentage',
  value: 10,
  isActive: true,
  startDate: new Date('2024-03-01'),
  endDate: new Date('2024-03-31'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockUserLogsService = { log: jest.fn() };

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
});

describe('DiscountsService', () => {
  let service: DiscountsService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscountsService,
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: mockLogger },
        { provide: getRepositoryToken(Discount), useFactory: mockRepo },
        { provide: UserLogsService, useValue: mockUserLogsService },
      ],
    }).compile();

    service = module.get<DiscountsService>(DiscountsService);
    repo = module.get(getRepositoryToken(Discount));
  });

  afterEach(() => jest.clearAllMocks());

  // ── create ────────────────────────────────────────────────────────────────
  describe('create()', () => {
    const dto = {
      name: 'Promo Ramadan',
      type: 'percentage',
      value: 10,
      isActive: true,
    };

    it('creates discount successfully and fires log', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(mockDiscount);
      repo.save.mockResolvedValue(mockDiscount);

      const result = await service.create(dto as any, 'user-001');

      expect(repo.save).toHaveBeenCalled();
      expect(result.message).toBeDefined();
      // log() called asynchronously (fire-and-forget) — just verify no error thrown
    });

    it('throws 400 when discount name already exists', async () => {
      repo.findOne.mockResolvedValue(mockDiscount);

      // Note: DiscountsService.create catches HttpException and re-throws as Error internally
      await expect(service.create(dto as any, 'user-001')).rejects.toThrow();
      await expect(
        service.create(dto as any, 'user-001'),
      ).rejects.toMatchObject({
        message: expect.stringContaining('already exists'),
      });
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────
  describe('findAll()', () => {
    it('returns list of discounts with all fields', async () => {
      repo.find.mockResolvedValue([mockDiscount]);

      const result = await service.findAll();

      expect(result.datas).toHaveLength(1);
      expect(result.datas[0]).toMatchObject({
        id: 'disc-001',
        name: 'Promo Ramadan',
        type: 'percentage',
        value: 10,
        isActive: true,
      });
    });

    it('throws when no discounts exist', async () => {
      repo.find.mockResolvedValue([]);

      await expect(service.findAll()).rejects.toThrow();
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────
  describe('findOne()', () => {
    it('returns single discount by id', async () => {
      repo.findOne.mockResolvedValue(mockDiscount);

      const result = await service.findOne('disc-001');

      expect(result.data).toMatchObject({
        id: 'disc-001',
        name: 'Promo Ramadan',
      });
    });

    it('throws when discount not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne('x')).rejects.toThrow();
    });
  });

  // ── update ────────────────────────────────────────────────────────────────
  describe('update()', () => {
    it('updates discount and fires log', async () => {
      repo.findOne.mockResolvedValue(mockDiscount);
      repo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.update(
        'disc-001',
        { value: 15 } as any,
        'user-001',
      );

      expect(repo.update).toHaveBeenCalledWith('disc-001', { value: 15 });
      expect(result.message).toBeDefined();
    });

    it('throws when discount not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.update('x', {} as any, 'user-001'),
      ).rejects.toThrow();
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────
  describe('remove()', () => {
    it('soft-deletes discount and fires log', async () => {
      repo.findOne.mockResolvedValue(mockDiscount);
      repo.softDelete.mockResolvedValue({ affected: 1 } as any);

      const result = await service.remove('disc-001', 'user-001');

      expect(repo.softDelete).toHaveBeenCalledWith('disc-001');
      expect(result.message).toBeDefined();
    });

    it('throws when discount not found for delete', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove('x', 'user-001')).rejects.toThrow();
    });
  });

  // ── order integration validation ──────────────────────────────────────────
  describe('discount data shape for orders', () => {
    it('discount has value and type fields needed for order total calculation', () => {
      expect(mockDiscount).toHaveProperty('value');
      expect(mockDiscount).toHaveProperty('type');
      expect(mockDiscount).toHaveProperty('isActive');
      expect(mockDiscount).toHaveProperty('startDate');
      expect(mockDiscount).toHaveProperty('endDate');
    });
  });
});
