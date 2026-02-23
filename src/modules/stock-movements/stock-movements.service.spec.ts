import { Test, TestingModule } from '@nestjs/testing';
import { StockMovementsService } from './stock-movements.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StockMovement } from './entities/stock-movement.entity';
import { NotFoundException } from '@nestjs/common';

describe('StockMovementsService', () => {
  let service: StockMovementsService;
  let repository: any;

  const mockStockMovement = {
    id: 'movement-id',
    productId: 'product-id',
    variantId: 'variant-id',
    branchId: 'branch-id',
    quantity: 10,
    type: 'IN',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockMovementsService,
        {
          provide: getRepositoryToken(StockMovement),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<StockMovementsService>(StockMovementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a stock movement successfully', async () => {
      const createDto: any = {
        productId: 'product-id',
        branchId: 'branch-id',
        quantity: 10,
        type: 'IN',
      };

      repository.create.mockReturnValue(mockStockMovement);
      repository.save.mockResolvedValue(mockStockMovement);

      const result = await service.create(createDto);

      expect(result).toEqual(mockStockMovement);
      expect(repository.create).toHaveBeenCalledWith({
        quantity: 10,
        type: 'IN',
        product: { id: 'product-id' },
        productVariant: undefined,
        branch: { id: 'branch-id' },
      });
      expect(repository.save).toHaveBeenCalledWith(mockStockMovement);
    });

    it('should throw NotFoundException on error', async () => {
      const createDto: any = {
        productId: 'product-id',
        branchId: 'branch-id',
        quantity: 10,
        type: 'IN',
      };

      repository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all stock movements', async () => {
      repository.find.mockResolvedValue([mockStockMovement]);

      const result = await service.findAll();

      expect(result).toEqual([mockStockMovement]);
      expect(repository.find).toHaveBeenCalledWith({
        where: undefined,
        relations: ['product', 'productVariant', 'branch'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should return stock movements filtered by branchId', async () => {
      repository.find.mockResolvedValue([mockStockMovement]);

      const result = await service.findAll('branch-id');

      expect(result).toEqual([mockStockMovement]);
      expect(repository.find).toHaveBeenCalledWith({
        where: { branch: { id: 'branch-id' } },
        relations: ['product', 'productVariant', 'branch'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should throw NotFoundException on error', async () => {
      repository.find.mockRejectedValue(new Error('Database error'));

      await expect(service.findAll()).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return a stock movement by id', async () => {
      repository.findOne.mockResolvedValue(mockStockMovement);

      const result = await service.findOne('movement-id');

      expect(result).toEqual(mockStockMovement);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'movement-id' },
        relations: ['product', 'productVariant', 'branch'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        new NotFoundException('Stock movement with ID invalid-id not found'),
      );
    });

    it('should throw NotFoundException on error', async () => {
      repository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.findOne('movement-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should return update message', () => {
      expect(service.update(1, {} as any)).toEqual(
        'This action updates a #1 stockMovement',
      );
    });
  });

  describe('remove', () => {
    it('should return remove message', () => {
      expect(service.remove(1)).toEqual(
        'This action removes a #1 stockMovement',
      );
    });
  });
});
