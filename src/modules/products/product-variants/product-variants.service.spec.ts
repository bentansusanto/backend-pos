import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CloudinaryService } from 'src/common/cloudinary/cloudinary.service';
import { errProductMessage } from 'src/libs/errors/error_product';
import { successProductMessage } from 'src/libs/success/success_product';
import { ProductVariant } from '../entities/product-variant.entity';
import { ProductsService } from '../products.service';
import { ProductVariantsService } from './product-variants.service';

describe('ProductVariantsService', () => {
  let service: ProductVariantsService;
  let productVariantRepository;
  let productsService;
  let cloudinaryService;
  let logger;

  const mockProduct = {
    id: 'product-id',
    name_product: 'Test Product',
    slug: 'test-product',
  };

  const mockProductVariant = {
    id: 'variant-id',
    name_variant: 'Test Variant',
    price: 100,
    sku: 'TEST-VAR-123',
    weight: 1,
    color: 'Red',
    thumbnail: 'thumbnail-url',
    product: mockProduct,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProductVariantRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockProductsService = {
    findOne: jest.fn(),
  };

  const mockCloudinaryService = {
    uploadFile: jest.fn(),
    uploadBase64: jest.fn(),
  };

  const mockLogger = {
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductVariantsService,
        {
          provide: getRepositoryToken(ProductVariant),
          useValue: mockProductVariantRepository,
        },
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ProductVariantsService>(ProductVariantsService);
    productVariantRepository = module.get(getRepositoryToken(ProductVariant));
    productsService = module.get(ProductsService);
    cloudinaryService = module.get(CloudinaryService);
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createProductVariantDto = {
      productId: 'product-id',
      name_variant: 'Test Variant',
      price: 100,
      weight: 1,
      color: 'Red',
      thumbnail: 'thumbnail-url',
    };

    it('should create a product variant successfully', async () => {
      jest
        .spyOn(productsService, 'findOne')
        .mockResolvedValue({ data: mockProduct });
      jest.spyOn(productVariantRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(productVariantRepository, 'create')
        .mockReturnValue(mockProductVariant);
      jest
        .spyOn(productVariantRepository, 'save')
        .mockResolvedValue(mockProductVariant);
      jest
        .spyOn(cloudinaryService, 'uploadFile')
        .mockResolvedValue('thumbnail-url');

      const result = await service.create(createProductVariantDto, {} as any);

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_CREATE_PRODUCT_VARIANT,
      );
      expect(result.data.id).toEqual(mockProductVariant.id);
      expect(productsService.findOne).toHaveBeenCalledWith(
        createProductVariantDto.productId,
      );
    });

    it('should throw an error if product not found', async () => {
      jest.spyOn(productsService, 'findOne').mockResolvedValue(null);

      await expect(service.create(createProductVariantDto)).rejects.toThrow(
        new HttpException(
          errProductMessage.ERROR_VARIANT_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('update', () => {
    const updateProductVariantDto = {
      productId: 'product-id',
      name_variant: 'Updated Variant',
      price: 150,
      weight: 2,
      color: 'Blue',
      thumbnail: 'updated-thumbnail-url',
    };

    it('should update a product variant successfully', async () => {
      jest
        .spyOn(productVariantRepository, 'findOne')
        .mockResolvedValue(mockProductVariant);
      jest
        .spyOn(productVariantRepository, 'update')
        .mockResolvedValue({ affected: 1 });
      jest
        .spyOn(cloudinaryService, 'uploadFile')
        .mockResolvedValue('updated-thumbnail-url');

      const result = await service.update(
        'variant-id',
        updateProductVariantDto,
        {} as any,
      );

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_UPDATE_PRODUCT_VARIANT,
      );
      expect(result.data.id).toEqual(mockProductVariant.id);
    });

    it('should throw an error if variant not found for update', async () => {
      jest.spyOn(productVariantRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.update('invalid-id', updateProductVariantDto),
      ).rejects.toThrow(
        new HttpException(
          errProductMessage.ERROR_VARIANT_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('delete', () => {
    it('should delete a product variant successfully', async () => {
      jest
        .spyOn(productVariantRepository, 'findOne')
        .mockResolvedValue(mockProductVariant);
      jest
        .spyOn(productVariantRepository, 'softDelete')
        .mockResolvedValue({ affected: 1 });

      const result = await service.delete('variant-id');

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_DELETE_PRODUCT_VARIANT,
      );
    });

    it('should throw an error if variant not found for deletion', async () => {
      jest.spyOn(productVariantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.delete('invalid-id')).rejects.toThrow(
        new HttpException(
          errProductMessage.ERROR_VARIANT_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('findOne', () => {
    it('should return a product variant by id', async () => {
      jest
        .spyOn(productVariantRepository, 'findOne')
        .mockResolvedValue(mockProductVariant);

      const result = await service.findOne('variant-id');

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_FIND_VARIANT,
      );
      expect(result.data.id).toEqual(mockProductVariant.id);
    });

    it('should throw an error if variant not found', async () => {
      jest.spyOn(productVariantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        new HttpException(
          errProductMessage.ERROR_VARIANT_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('findAll', () => {
    it('should return all product variants', async () => {
      jest
        .spyOn(productVariantRepository, 'find')
        .mockResolvedValue([mockProductVariant]);

      const result = await service.findAll();

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_FIND_VARIANT,
      );
      expect(result.datas.length).toBe(1);
    });

    it('should filter by branchId', async () => {
      jest
        .spyOn(productVariantRepository, 'find')
        .mockResolvedValue([mockProductVariant]);

      await service.findAll('branch-id');

      expect(productVariantRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productStocks: { branch: { id: 'branch-id' } } },
        }),
      );
    });
  });
});
