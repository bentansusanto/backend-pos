import { Test, TestingModule } from '@nestjs/testing';
import { successProductMessage } from 'src/libs/success/success_product';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let service: CategoriesService;

  const mockCategory = {
    id: 'category-id',
    name: 'Test Category',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCategoriesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    service = module.get<CategoriesService>(CategoriesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a category', async () => {
      const createCategoryDto = { name: 'Test Category' };
      jest.spyOn(service, 'create').mockResolvedValue({
        message: successProductMessage.SUCCESS_CREATE_CATEGORY,
        data: mockCategory,
      });

      const result = await controller.create(createCategoryDto);

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_CREATE_CATEGORY,
      );
      expect(result.data).toEqual(mockCategory);
      expect(service.create).toHaveBeenCalledWith(createCategoryDto);
    });
  });

  describe('findAll', () => {
    it('should return all categories', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue({
        message: successProductMessage.SUCCESS_FIND_ALL_CATEGORY,
        datas: [mockCategory],
      });

      const result = await controller.findAll();

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_FIND_ALL_CATEGORY,
      );
      expect(result.data).toEqual([mockCategory]);
    });
  });

  describe('findById', () => {
    it('should return a category by id', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        message: successProductMessage.SUCCESS_FIND_CATEGORY,
        data: mockCategory,
      });

      const result = await controller.findById('category-id');

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_FIND_CATEGORY,
      );
      expect(result.data).toEqual(mockCategory);
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      const updateCategoryDto = { name: 'Updated Category' };
      jest.spyOn(service, 'update').mockResolvedValue({
        message: successProductMessage.SUCCESS_UPDATE_CATEGORY,
        data: mockCategory,
      });

      const result = await controller.update('category-id', updateCategoryDto);

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_UPDATE_CATEGORY,
      );
      expect(result.data).toEqual(mockCategory);
    });
  });

  describe('delete', () => {
    it('should delete a category', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue({
        message: successProductMessage.SUCCESS_DELETE_CATEGORY,
      });

      const result = await controller.delete('category-id');

      expect(result.message).toEqual(
        successProductMessage.SUCCESS_DELETE_CATEGORY,
      );
    });
  });
});
