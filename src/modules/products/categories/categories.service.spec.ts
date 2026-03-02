import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Category } from '../entities/category.entities';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { HttpException, HttpStatus } from '@nestjs/common';
import { errProductMessage } from 'src/libs/errors/error_product';
import { successProductMessage } from 'src/libs/success/success_product';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let categoryRepository;
  let logger;

  const mockCategory = {
    id: 'category-id',
    name: 'Test Category',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCategoryRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockLogger = {
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepository,
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    categoryRepository = module.get(getRepositoryToken(Category));
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a category successfully', async () => {
      const createCategoryDto = { name: 'Test Category' };
      jest.spyOn(categoryRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(categoryRepository, 'create').mockReturnValue(mockCategory);
      jest.spyOn(categoryRepository, 'save').mockResolvedValue(mockCategory);

      const result = await service.create(createCategoryDto);

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_CREATE_CATEGORY,
      );
      expect(result.data.id).toEqual(mockCategory.id);
      expect(categoryRepository.create).toHaveBeenCalledWith(createCategoryDto);
    });

    it('should throw an error if category name already exists', async () => {
      const createCategoryDto = { name: 'Test Category' };
      jest.spyOn(categoryRepository, 'findOne').mockResolvedValue(mockCategory);

      await expect(service.create(createCategoryDto)).rejects.toThrow(
        new HttpException(
          errProductMessage.ERROR_CATEGORY_NAME_EXIST,
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('findAll', () => {
    it('should return all categories', async () => {
      jest.spyOn(categoryRepository, 'find').mockResolvedValue([mockCategory]);

      const result = await service.findAll();

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_FIND_ALL_CATEGORY,
      );
      expect(result.datas.length).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a category by id', async () => {
      jest.spyOn(categoryRepository, 'findOne').mockResolvedValue(mockCategory);

      const result = await service.findOne('category-id');

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_FIND_CATEGORY,
      );
      expect(result.data.id).toEqual(mockCategory.id);
    });

    it('should throw an error if category not found', async () => {
      jest.spyOn(categoryRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        new HttpException(
          errProductMessage.ERROR_FIND_CATEGORY,
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('update', () => {
    it('should update a category successfully', async () => {
      const updateCategoryDto = { name: 'Updated Category' };
      jest.spyOn(categoryRepository, 'findOne').mockResolvedValue(mockCategory);
      jest
        .spyOn(categoryRepository, 'update')
        .mockResolvedValue({ affected: 1 });

      const result = await service.update('category-id', updateCategoryDto);

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_UPDATE_CATEGORY,
      );
      expect(result.data.id).toEqual(mockCategory.id);
    });

    it('should throw an error if category not found for update', async () => {
      jest.spyOn(categoryRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update('invalid-id', {})).rejects.toThrow(
        new HttpException(
          errProductMessage.ERROR_FIND_CATEGORY,
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('remove', () => {
    it('should delete a category successfully', async () => {
      jest.spyOn(categoryRepository, 'findOne').mockResolvedValue(mockCategory);
      jest
        .spyOn(categoryRepository, 'delete')
        .mockResolvedValue({ affected: 1 });

      const result = await service.remove('category-id');

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_DELETE_CATEGORY,
      );
    });

    it('should throw an error if category not found for deletion', async () => {
      jest.spyOn(categoryRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(
        new HttpException(
          errProductMessage.ERROR_FIND_CATEGORY,
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });
});
