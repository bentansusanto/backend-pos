import { Test, TestingModule } from '@nestjs/testing';
import { ExpenseCategoriesService } from './expense-categories.service';

describe('ExpenseCategoriesService', () => {
  let service: ExpenseCategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExpenseCategoriesService],
    }).compile();

    service = module.get<ExpenseCategoriesService>(ExpenseCategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
