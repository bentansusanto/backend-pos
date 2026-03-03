import { Test, TestingModule } from '@nestjs/testing';
import { CostLayersController } from './cost_layers.controller';
import { CostLayersService } from './cost_layers.service';

describe('CostLayersController', () => {
  let controller: CostLayersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CostLayersController],
      providers: [CostLayersService],
    }).compile();

    controller = module.get<CostLayersController>(CostLayersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
