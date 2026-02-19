import { Test, TestingModule } from '@nestjs/testing';
import { AiJobsService } from './ai-jobs.service';

describe('AiJobsService', () => {
  let service: AiJobsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiJobsService],
    }).compile();

    service = module.get<AiJobsService>(AiJobsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
