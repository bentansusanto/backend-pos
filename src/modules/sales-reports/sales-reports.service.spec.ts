import { Test, TestingModule } from '@nestjs/testing';
import { SalesReportsService } from './sales-reports.service';

describe('SalesReportsService', () => {
  let service: SalesReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SalesReportsService],
    }).compile();

    service = module.get<SalesReportsService>(SalesReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
