import { Test, TestingModule } from '@nestjs/testing';
import { StockMovementsController } from './stock-movements.controller';
import { StockMovementsService } from './stock-movements.service';

describe('StockMovementsController', () => {
  let controller: StockMovementsController;
  let service: StockMovementsService;

  const mockStockMovement: any = {
    id: 'movement-id',
    productId: 'product-id',
    variantId: 'variant-id',
    branchId: 'branch-id',
    quantity: 10,
    type: 'IN',
    createdAt: new Date(),
  };

  const mockStockMovementsService = {
    create: jest.fn().mockResolvedValue(mockStockMovement),
    findAll: jest.fn().mockResolvedValue([mockStockMovement]),
    findOne: jest.fn().mockResolvedValue(mockStockMovement),
    update: jest.fn().mockResolvedValue(mockStockMovement),
    remove: jest.fn().mockResolvedValue(mockStockMovement),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockMovementsController],
      providers: [
        {
          provide: StockMovementsService,
          useValue: mockStockMovementsService,
        },
      ],
    }).compile();

    controller = module.get<StockMovementsController>(StockMovementsController);
    service = module.get<StockMovementsService>(StockMovementsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a stock movement', async () => {
      const createDto = {
        productId: 'product-id',
        branchId: 'branch-id',
        quantity: 10,
        type: 'IN',
      } as any;

      const result = await controller.create(createDto);

      expect(result).toEqual({
        message: 'Stock movement created successfully',
        data: mockStockMovement,
      });
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return all stock movements', async () => {
      const result = await controller.findAll();

      expect(result).toEqual({
        message: 'Stock movements retrieved successfully',
        data: [mockStockMovement],
      });
      expect(service.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should return stock movements filtered by branchId', async () => {
      const result = await controller.findAll('branch-id');

      expect(result).toEqual({
        message: 'Stock movements retrieved successfully',
        data: [mockStockMovement],
      });
      expect(service.findAll).toHaveBeenCalledWith('branch-id');
    });
  });

  describe('findOne', () => {
    it('should return a stock movement by id', async () => {
      const result = await controller.findOne('movement-id');

      expect(result).toEqual({
        message: 'Stock movement retrieved successfully',
        data: mockStockMovement,
      });
      expect(service.findOne).toHaveBeenCalledWith('movement-id');
    });
  });

  describe('update', () => {
    it('should update a stock movement', async () => {
      const result = await controller.update('1', {} as any);

      expect(result).toEqual({
        message: 'Stock movement updated successfully',
        data: mockStockMovement,
      });
      expect(service.update).toHaveBeenCalledWith(1, {});
    });
  });

  describe('remove', () => {
    it('should remove a stock movement', async () => {
      const result = await controller.remove('1');

      expect(result).toEqual({
        message: 'Stock movement deleted successfully',
        data: mockStockMovement,
      });
      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});
