import { Test, TestingModule } from '@nestjs/testing';
import { successProductMessage } from 'src/libs/success/success_product';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

  const mockProduct = {
    id: 'product-id',
    name_product: 'Test Product',
    price: 100,
    category_id: 'category-id',
    description: 'Test Description',
  };

  const mockProductsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a product', async () => {
      const createProductDto = {
        name_product: 'Test Product',
        price: 100,
        category_id: 'category-id',
        description: 'Test Description',
        thumbnail: undefined,
        images: undefined,
      };
      const mockFiles = {
        thumbnail: [{ originalname: 'thumb.jpg' } as any],
        images: [{ originalname: 'img1.jpg' } as any],
      };

      jest.spyOn(service, 'create').mockResolvedValue({
        message: successProductMessage.SUCCESS_CREATE_PRODUCT,
        data: mockProduct as any,
      });

      const result = await controller.create(createProductDto, mockFiles);

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_CREATE_PRODUCT,
      );
      expect(result.data).toEqual(mockProduct);
      expect(service.create).toHaveBeenCalledWith(
        createProductDto,
        mockFiles.thumbnail[0],
        mockFiles.images,
      );
    });
  });

  describe('findAll', () => {
    it('should return all products', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue({
        message: successProductMessage.SUCCESS_FIND_ALL_PRODUCT,
        datas: [mockProduct] as any,
      });

      const result = await controller.findAll();

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_FIND_ALL_PRODUCT,
      );
      expect(result.data).toEqual([mockProduct]);
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        message: successProductMessage.SUCCESS_FIND_PRODUCT,
        data: mockProduct as any,
      });

      const result = await controller.findOne('product-id');

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_FIND_PRODUCT,
      );
      expect(result.data).toEqual(mockProduct);
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      const updateProductDto = {
        name_product: 'Updated Product',
        price: 150,
        category_id: 'category-id',
        description: 'Updated Description',
      };
      const mockFiles = {
        thumbnail: [{ originalname: 'thumb.jpg' } as any],
        images: [{ originalname: 'img1.jpg' } as any],
      };

      jest.spyOn(service, 'update').mockResolvedValue({
        message: successProductMessage.SUCCESS_UPDATE_PRODUCT,
        data: mockProduct as any,
      });

      const result = await controller.update(
        'product-id',
        updateProductDto,
        mockFiles,
      );

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_UPDATE_PRODUCT,
      );
      expect(result.data).toEqual(mockProduct);
      expect(service.update).toHaveBeenCalledWith(
        'product-id',
        updateProductDto,
        mockFiles.thumbnail[0],
        mockFiles.images,
      );
    });
  });

  describe('remove', () => {
    it('should delete a product', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue({
        message: successProductMessage.SUCCESS_DELETE_PRODUCT,
      });

      const result = await controller.remove('product-id');

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_DELETE_PRODUCT,
      );
    });
  });
});
