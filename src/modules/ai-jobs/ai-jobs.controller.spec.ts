import { Test, TestingModule } from '@nestjs/testing';
import { AiJobsController } from './ai-jobs.controller';
import { AiJobsService } from './ai-jobs.service';

describe('AiJobsController', () => {
  let controller: AiJobsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiJobsController],
      providers: [AiJobsService],
    }).compile();

    controller = module.get<AiJobsController>(AiJobsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
