import { Test, TestingModule } from '@nestjs/testing';
import { ExpenseCategoriesController } from './expense-categories.controller';
import { ExpenseCategoriesService } from './expense-categories.service';

describe('ExpenseCategoriesController', () => {
  let controller: ExpenseCategoriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpenseCategoriesController],
      providers: [ExpenseCategoriesService],
    }).compile();

    controller = module.get<ExpenseCategoriesController>(ExpenseCategoriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
