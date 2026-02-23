import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CloudinaryService } from 'src/common/cloudinary/cloudinary.service';
import { errProductMessage } from 'src/libs/errors/error_product';
import { successProductMessage } from 'src/libs/success/success_product';
import { CategoriesService } from './categories/categories.service';
import { ProductVariant } from './entities/product-variant.entity';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepository;
  let productVariantRepository;
  let categoriesService;
  let cloudinaryService;
  let logger;

  const mockCategory = {
    id: 'category-id',
    name: 'Test Category',
  };

  const mockProduct = {
    id: 'product-id',
    name_product: 'Test Product',
    price: 100,
    category: mockCategory,
    slug: 'test-product',
    sku: 'SKU-TEST-1234',
    description: 'Test Description',
    thumbnail: 'thumbnail-url',
    images: ['image-url-1'],
    createdAt: new Date(),
    updatedAt: new Date(),
    productVariants: [],
    productStocks: [],
  };

  const mockProductRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockProductVariantRepository = {
    softDelete: jest.fn(),
  };

  const mockCategoriesService = {
    findOne: jest.fn(),
  };

  const mockCloudinaryService = {
    uploadFile: jest.fn(),
    uploadMultipleFiles: jest.fn(),
  };

  const mockLogger = {
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: getRepositoryToken(ProductVariant),
          useValue: mockProductVariantRepository,
        },
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
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

    service = module.get<ProductsService>(ProductsService);
    productRepository = module.get(getRepositoryToken(Product));
    productVariantRepository = module.get(getRepositoryToken(ProductVariant));
    categoriesService = module.get(CategoriesService);
    cloudinaryService = module.get(CloudinaryService);
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createProductDto = {
      name_product: 'Test Product',
      price: 100,
      category_id: 'category-id',
      description: 'Test Description',
      thumbnail: undefined,
      images: undefined,
    };

    it('should create a product successfully', async () => {
      jest
        .spyOn(categoriesService, 'findOne')
        .mockResolvedValue({ data: mockCategory });
      jest
        .spyOn(cloudinaryService, 'uploadFile')
        .mockResolvedValue('thumbnail-url');
      jest
        .spyOn(cloudinaryService, 'uploadMultipleFiles')
        .mockResolvedValue(['image-url-1']);
      jest.spyOn(productRepository, 'create').mockReturnValue(mockProduct);
      jest.spyOn(productRepository, 'save').mockResolvedValue(mockProduct);

      const result = await service.create(createProductDto, {} as any, [
        {} as any,
      ]);

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_CREATE_PRODUCT,
      );
      expect(result.data.id).toEqual(mockProduct.id);
      expect(categoriesService.findOne).toHaveBeenCalledWith(
        createProductDto.category_id,
      );
    });

    it('should throw an error if category not found', async () => {
      jest.spyOn(categoriesService, 'findOne').mockResolvedValue(null);

      await expect(service.create(createProductDto)).rejects.toThrow(
        new HttpException(
          errProductMessage.ERROR_CATEGORY_NOT_FOUND,
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('findAll', () => {
    it('should return all products', async () => {
      jest.spyOn(productRepository, 'find').mockResolvedValue([mockProduct]);

      const result = await service.findAll();

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_FIND_ALL_PRODUCT,
      );
      expect(result.datas.length).toBe(1);
    });

    it('should throw error if no products found', async () => {
      jest.spyOn(productRepository, 'find').mockResolvedValue([]);

      await expect(service.findAll()).rejects.toThrow(
        new HttpException(
          errProductMessage.ERROR_FIND_ALL_PRODUCT,
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct);

      const result = await service.findOne('product-id');

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_FIND_PRODUCT,
      );
      expect(result.data.id).toEqual(mockProduct.id);
    });

    it('should throw an error if product not found', async () => {
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        new HttpException(
          errProductMessage.ERROR_FIND_PRODUCT,
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('update', () => {
    const updateProductDto = {
      name_product: 'Updated Product',
      price: 150,
      category_id: 'category-id',
      description: 'Updated Description',
    };

    it('should update a product successfully', async () => {
      jest
        .spyOn(categoriesService, 'findOne')
        .mockResolvedValue({ data: mockCategory });
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct);
      jest
        .spyOn(productRepository, 'update')
        .mockResolvedValue({ affected: 1 });
      jest
        .spyOn(cloudinaryService, 'uploadFile')
        .mockResolvedValue('updated-thumbnail-url');

      const result = await service.update(
        'product-id',
        updateProductDto,
        {} as any,
      );

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_UPDATE_PRODUCT,
      );
      expect(result.data.id).toEqual(mockProduct.id);
    });

    it('should throw an error if category not found for update', async () => {
      jest.spyOn(categoriesService, 'findOne').mockResolvedValue(null);
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct);

      await expect(
        service.update('product-id', updateProductDto),
      ).rejects.toThrow(
        new HttpException(
          errProductMessage.ERROR_FIND_CATEGORY,
          HttpStatus.NOT_FOUND,
        ),
      );
    });

    it('should throw an error if product not found for update', async () => {
      jest
        .spyOn(categoriesService, 'findOne')
        .mockResolvedValue({ data: mockCategory });
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.update('invalid-id', updateProductDto),
      ).rejects.toThrow(
        new HttpException(
          errProductMessage.ERROR_FIND_PRODUCT,
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('remove', () => {
    it('should delete a product successfully', async () => {
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct);
      jest
        .spyOn(productVariantRepository, 'softDelete')
        .mockResolvedValue({ affected: 1 });
      jest
        .spyOn(productRepository, 'softDelete')
        .mockResolvedValue({ affected: 1 });

      const result = await service.remove('product-id');

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_DELETE_PRODUCT,
      );
    });

    it('should throw an error if product not found for deletion', async () => {
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(
        new HttpException(
          errProductMessage.ERROR_FIND_PRODUCT,
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });
});
