import { Test, TestingModule } from '@nestjs/testing';
import { AiInsightController } from './ai-insight.controller';
import { AiInsightService } from './ai-insight.service';

describe('AiInsightController', () => {
  let controller: AiInsightController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiInsightController],
      providers: [AiInsightService],
    }).compile();

    controller = module.get<AiInsightController>(AiInsightController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
