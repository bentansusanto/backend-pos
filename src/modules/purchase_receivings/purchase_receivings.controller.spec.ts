import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseReceivingsController } from './purchase_receivings.controller';
import { PurchaseReceivingsService } from './purchase_receivings.service';

describe('PurchaseReceivingsController', () => {
  let controller: PurchaseReceivingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PurchaseReceivingsController],
      providers: [PurchaseReceivingsService],
    }).compile();

    controller = module.get<PurchaseReceivingsController>(PurchaseReceivingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
