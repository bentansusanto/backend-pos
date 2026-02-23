import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { errBranchMessage } from 'src/libs/errors/error_branch';
import { errProductMessage } from 'src/libs/errors/error_product';
import { errProductStockMessage } from 'src/libs/errors/error_product_stock';
import { successProductStockMessage } from 'src/libs/success/success_product_stock';
import { BranchesService } from '../branches/branches.service';
import { ProductVariantsService } from '../products/product-variants/product-variants.service';
import { referenceType } from '../stock-movements/entities/stock-movement.entity';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { ProductStock } from './entities/product-stock.entity';
import { ProductStocksService } from './product-stocks.service';

describe('ProductStocksService', () => {
  let service: ProductStocksService;
  let productStockRepository;
  let productVariantsService;
  let branchesService;
  let stockMovementsService;
  let logger;

  const mockProductStock = {
    id: 'stock-id',
    product: { id: 'product-id' },
    productVariant: { id: 'variant-id' },
    branch: { id: 'branch-id' },
    stock: 10,
    minStock: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBranch = {
    id: 'branch-id',
    name: 'Test Branch',
  };

  const mockProductVariant = {
    id: 'variant-id',
    product_id: 'product-id',
  };

  const mockProductStockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockProductVariantsService = {
    findOne: jest.fn(),
  };

  const mockBranchesService = {
    findOne: jest.fn(),
  };

  const mockStockMovementsService = {
    create: jest.fn(),
  };

  const mockLogger = {
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductStocksService,
        {
          provide: getRepositoryToken(ProductStock),
          useValue: mockProductStockRepository,
        },
        {
          provide: ProductVariantsService,
          useValue: mockProductVariantsService,
        },
        {
          provide: BranchesService,
          useValue: mockBranchesService,
        },
        {
          provide: StockMovementsService,
          useValue: mockStockMovementsService,
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ProductStocksService>(ProductStocksService);
    productStockRepository = module.get(getRepositoryToken(ProductStock));
    productVariantsService = module.get(ProductVariantsService);
    branchesService = module.get(BranchesService);
    stockMovementsService = module.get(StockMovementsService);
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      productId: 'product-id',
      variantId: 'variant-id',
      branchId: 'branch-id',
      stock: 10,
      minStock: 5,
    };

    it('should create product stock successfully', async () => {
      jest
        .spyOn(branchesService, 'findOne')
        .mockResolvedValue({ data: mockBranch });
      jest
        .spyOn(productVariantsService, 'findOne')
        .mockResolvedValue({ data: mockProductVariant });
      jest
        .spyOn(productStockRepository, 'create')
        .mockReturnValue(mockProductStock);
      jest
        .spyOn(productStockRepository, 'save')
        .mockResolvedValue(mockProductStock);
      jest.spyOn(stockMovementsService, 'create').mockResolvedValue({});

      const result = await service.create(createDto);

      expect(result.message).toEqual(
        successProductStockMessage.SUCCESS_CREATE_PRODUCT_STOCK,
      );
      expect(result.data.id).toEqual(mockProductStock.id);
      expect(stockMovementsService.create).toHaveBeenCalledWith({
        productId: 'product-id',
        variantId: 'variant-id',
        branchId: 'branch-id',
        referenceType: referenceType.ADJUST,
        qty: 10,
        referenceId: mockProductStock.id,
      });
    });

    it('should throw error if branch not found', async () => {
      jest.spyOn(branchesService, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        new HttpException(
          errBranchMessage.BRANCH_NOT_FOUND,
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw error if variant not found', async () => {
      jest
        .spyOn(branchesService, 'findOne')
        .mockResolvedValue({ data: mockBranch });
      jest.spyOn(productVariantsService, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        new HttpException(
          errProductMessage.ERROR_FIND_VARIANT,
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('findAll', () => {
    it('should return all product stocks', async () => {
      jest
        .spyOn(productStockRepository, 'find')
        .mockResolvedValue([mockProductStock]);

      const result = await service.findAll();

      expect(result.message).toEqual(
        successProductStockMessage.SUCCESS_GET_PRODUCT_STOCKS,
      );
      expect(result.datas.length).toBe(1);
    });

    it('should filter by branchId', async () => {
      jest
        .spyOn(productStockRepository, 'find')
        .mockResolvedValue([mockProductStock]);

      await service.findAll('branch-id');

      expect(productStockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { branch: { id: 'branch-id' } },
        }),
      );
    });

    it('should throw error if no stocks found', async () => {
      jest.spyOn(productStockRepository, 'find').mockResolvedValue([]);

      await expect(service.findAll()).rejects.toThrow(
        new HttpException(
          errProductStockMessage.ERR_GET_PRODUCT_STOCKS,
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('findOne', () => {
    it('should return product stock by id', async () => {
      jest
        .spyOn(productStockRepository, 'findOne')
        .mockResolvedValue(mockProductStock);

      const result = await service.findOne('stock-id');

      expect(result.message).toEqual(
        successProductStockMessage.SUCCESS_GET_PRODUCT_STOCK,
      );
      expect(result.data.id).toEqual(mockProductStock.id);
    });

    it('should throw error if stock not found', async () => {
      jest.spyOn(productStockRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        new HttpException(
          errProductStockMessage.ERR_GET_PRODUCT_STOCK,
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      stock: 20,
      minStock: 10,
    };

    it('should update product stock successfully', async () => {
      jest
        .spyOn(productStockRepository, 'findOne')
        .mockResolvedValue(mockProductStock);
      jest
        .spyOn(productStockRepository, 'update')
        .mockResolvedValue({ affected: 1 });
      jest.spyOn(stockMovementsService, 'create').mockResolvedValue({});

      const result = await service.update('stock-id', updateDto);

      expect(result.message).toEqual(
        successProductStockMessage.SUCCESS_UPDATE_PRODUCT_STOCK,
      );
      expect(stockMovementsService.create).toHaveBeenCalledWith({
        productId: mockProductStock.product.id,
        variantId: mockProductStock.productVariant.id,
        branchId: mockProductStock.branch.id,
        referenceType: referenceType.ADJUST,
        qty: 10, // 20 - 10
        referenceId: mockProductStock.id,
      });
    });

    it('should throw error if stock not found', async () => {
      jest.spyOn(productStockRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update('invalid-id', updateDto)).rejects.toThrow(
        new HttpException(
          errProductStockMessage.ERR_GET_PRODUCT_STOCK,
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('remove', () => {
    it('should remove product stock successfully', async () => {
      jest
        .spyOn(productStockRepository, 'findOne')
        .mockResolvedValue(mockProductStock);
      jest
        .spyOn(productStockRepository, 'softDelete')
        .mockResolvedValue({ affected: 1 });

      const result = await service.remove('stock-id');

      expect(result.message).toEqual(
        successProductStockMessage.SUCCESS_DELETE_PRODUCT_STOCK,
      );
    });

    it('should throw error if stock not found', async () => {
      jest.spyOn(productStockRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(
        new HttpException(
          errProductStockMessage.ERR_GET_PRODUCT_STOCK,
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });
});
