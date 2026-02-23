import { Test, TestingModule } from '@nestjs/testing';
import { ProductStocksController } from './product-stocks.controller';
import { ProductStocksService } from './product-stocks.service';
import { successProductStockMessage } from 'src/libs/success/success_product_stock';

describe('ProductStocksController', () => {
  let controller: ProductStocksController;
  let service: ProductStocksService;

  const mockProductStock = {
    id: 'stock-id',
    productId: 'product-id',
    variantId: 'variant-id',
    branchId: 'branch-id',
    stock: 10,
    minStock: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProductStocksService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductStocksController],
      providers: [
        {
          provide: ProductStocksService,
          useValue: mockProductStocksService,
        },
      ],
    }).compile();

    controller = module.get<ProductStocksController>(ProductStocksController);
    service = module.get<ProductStocksService>(ProductStocksService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create product stock', async () => {
      const createDto = {
        productId: 'product-id',
        variantId: 'variant-id',
        branchId: 'branch-id',
        stock: 10,
        minStock: 5,
      };

      jest.spyOn(service, 'create').mockResolvedValue({
        message: successProductStockMessage.SUCCESS_CREATE_PRODUCT_STOCK,
        data: mockProductStock,
      });

      const result = await controller.create(createDto);

      expect(result.message).toEqual(successProductStockMessage.SUCCESS_CREATE_PRODUCT_STOCK);
      expect(result.data).toEqual(mockProductStock);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return all product stocks', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue({
        message: successProductStockMessage.SUCCESS_GET_PRODUCT_STOCKS,
        datas: [mockProductStock],
      });

      const result = await controller.findAll();

      expect(result.message).toEqual(successProductStockMessage.SUCCESS_GET_PRODUCT_STOCKS);
      expect(result.data).toEqual([mockProductStock]);
    });
  });

  describe('findOne', () => {
    it('should return product stock by id', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        message: successProductStockMessage.SUCCESS_GET_PRODUCT_STOCK,
        data: mockProductStock,
      });

      const result = await controller.findOne('stock-id');

      expect(result.message).toEqual(successProductStockMessage.SUCCESS_GET_PRODUCT_STOCK);
      expect(result.data).toEqual(mockProductStock);
    });
  });

  describe('update', () => {
    it('should update product stock', async () => {
      const updateDto = {
        stock: 20,
        minStock: 10,
      };

      jest.spyOn(service, 'update').mockResolvedValue({
        message: successProductStockMessage.SUCCESS_UPDATE_PRODUCT_STOCK,
        data: mockProductStock,
      });

      const result = await controller.update('stock-id', updateDto);

      expect(result.message).toEqual(successProductStockMessage.SUCCESS_UPDATE_PRODUCT_STOCK);
      expect(result.data).toEqual(mockProductStock);
      expect(service.update).toHaveBeenCalledWith('stock-id', updateDto);
    });
  });

  describe('remove', () => {
    it('should remove product stock', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue({
        message: successProductStockMessage.SUCCESS_DELETE_PRODUCT_STOCK,
      });

      const result = await controller.remove('stock-id');

      expect(result.message).toEqual(successProductStockMessage.SUCCESS_DELETE_PRODUCT_STOCK);
    });
  });
});
