import { Test, TestingModule } from '@nestjs/testing';
import { ProductBatchesService } from './product-batches.service';

describe('ProductBatchesService', () => {
  let service: ProductBatchesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductBatchesService],
    }).compile();

    service = module.get<ProductBatchesService>(ProductBatchesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
