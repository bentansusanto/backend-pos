import { Test, TestingModule } from '@nestjs/testing';
import { CostLayersService } from './cost_layers.service';

describe('CostLayersService', () => {
  let service: CostLayersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CostLayersService],
    }).compile();

    service = module.get<CostLayersService>(CostLayersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
