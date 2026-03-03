import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseReceivingsService } from './purchase_receivings.service';

describe('PurchaseReceivingsService', () => {
  let service: PurchaseReceivingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PurchaseReceivingsService],
    }).compile();

    service = module.get<PurchaseReceivingsService>(PurchaseReceivingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
