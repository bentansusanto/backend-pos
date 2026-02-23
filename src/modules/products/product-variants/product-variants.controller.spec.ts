import { Test, TestingModule } from '@nestjs/testing';
import { successProductMessage } from 'src/libs/success/success_product';
import { ProductVariantsController } from './product-variants.controller';
import { ProductVariantsService } from './product-variants.service';

describe('ProductVariantsController', () => {
  let controller: ProductVariantsController;
  let service: ProductVariantsService;

  const mockProductVariant = {
    id: 'variant-id',
    name_variant: 'Test Variant',
    price: 100,
    sku: 'TEST-VAR-123',
    weight: 1,
    color: 'Red',
    thumbnail: 'thumbnail-url',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProductVariantsService = {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductVariantsController],
      providers: [
        {
          provide: ProductVariantsService,
          useValue: mockProductVariantsService,
        },
      ],
    }).compile();

    controller = module.get<ProductVariantsController>(
      ProductVariantsController,
    );
    service = module.get<ProductVariantsService>(ProductVariantsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a product variant', async () => {
      const createProductVariantDto = {
        productId: 'product-id',
        name_variant: 'Test Variant',
        price: 100,
        weight: 1,
        color: 'Red',
        thumbnail: 'thumbnail-url',
      };
      const mockFile = { originalname: 'thumb.jpg' } as any;

      jest.spyOn(service, 'create').mockResolvedValue({
        message: successProductMessage.SUCCESS_CREATE_PRODUCT_VARIANT,
        data: mockProductVariant as any,
      });

      const result = await controller.create(createProductVariantDto, mockFile);

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_CREATE_PRODUCT_VARIANT,
      );
      expect(result.data).toEqual(mockProductVariant);
      expect(service.create).toHaveBeenCalledWith(
        createProductVariantDto,
        mockFile,
      );
    });
  });

  describe('update', () => {
    it('should update a product variant', async () => {
      const updateProductVariantDto = {
        productId: 'product-id',
        name_variant: 'Updated Variant',
        price: 150,
        weight: 2,
        color: 'Blue',
        thumbnail: 'updated-thumbnail-url',
      };
      const mockFile = { originalname: 'thumb.jpg' } as any;

      jest.spyOn(service, 'update').mockResolvedValue({
        message: successProductMessage.SUCCESS_UPDATE_PRODUCT_VARIANT,
        data: mockProductVariant as any,
      });

      const result = await controller.update(
        'variant-id',
        updateProductVariantDto,
        mockFile,
      );

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_UPDATE_PRODUCT_VARIANT,
      );
      expect(result.data).toEqual(mockProductVariant);
      expect(service.update).toHaveBeenCalledWith(
        'variant-id',
        updateProductVariantDto,
        mockFile,
      );
    });
  });

  describe('delete', () => {
    it('should delete a product variant', async () => {
      jest.spyOn(service, 'delete').mockResolvedValue({
        message: successProductMessage.SUCCESS_DELETE_PRODUCT_VARIANT,
      });

      const result = await controller.delete('variant-id');

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_DELETE_PRODUCT_VARIANT,
      );
    });
  });

  describe('findOne', () => {
    it('should return a product variant by id', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        message: successProductMessage.SUCCESS_FIND_VARIANT,
        data: mockProductVariant as any,
      });

      const result = await controller.findOne('variant-id');

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_FIND_VARIANT,
      );
      expect(result.data).toEqual(mockProductVariant);
    });
  });

  describe('findAll', () => {
    it('should return all product variants', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue({
        message: successProductMessage.SUCCESS_FIND_VARIANT,
        datas: [mockProductVariant] as any,
      });

      const result = await controller.findAll();

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_FIND_VARIANT,
      );
      expect(result.data).toEqual([mockProductVariant]);
    });
  });
});
