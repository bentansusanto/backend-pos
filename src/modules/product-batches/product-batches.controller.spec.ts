import { Test, TestingModule } from '@nestjs/testing';
import { ProductBatchesController } from './product-batches.controller';
import { ProductBatchesService } from './product-batches.service';

describe('ProductBatchesController', () => {
  let controller: ProductBatchesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductBatchesController],
      providers: [ProductBatchesService],
    }).compile();

    controller = module.get<ProductBatchesController>(ProductBatchesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
