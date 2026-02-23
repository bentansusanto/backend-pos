import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AiJob, AiJobStatus } from '../ai-jobs/entities/ai-job.entity';
import { Order } from '../orders/entities/order.entity';
import { ProductStock } from '../product-stocks/entities/product-stock.entity';
import { AiInsightService } from './ai-insight.service';
import { AiInsight } from './entities/ai-insight.entity';

// Mock Hashids to avoid issues with environment variables
jest.mock('hashids', () => {
  return jest.fn().mockImplementation(() => {
    return {
      encode: jest.fn().mockReturnValue('mock-id'),
    };
  });
});

describe('AiInsightService', () => {
  let service: AiInsightService;
  let aiInsightRepository: any;
  let aiJobRepository: any;
  let orderRepository: any;
  let productStockRepository: any;
  let configService: any;
  let logger: any;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
    getMany: jest.fn(),
  };

  const mockAiInsight = {
    id: 'insight-id',
    branch: { id: 'branch-id' },
    type: 'report_summary',
    summary: 'Summary',
    metadata: {},
    createdAt: new Date(),
  };

  const mockAiJob = {
    id: 'job-id',
    branch: { id: 'branch-id' },
    status: AiJobStatus.PENDING,
    payload: [],
    generateId: jest.fn(),
  };

  beforeEach(async () => {
    aiInsightRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };
    aiJobRepository = {
      save: jest.fn(),
    };
    orderRepository = {
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };
    productStockRepository = {
      find: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };
    configService = {
      get: jest.fn((key) => {
        if (key === 'AI_API_KEY') return 'mock-api-key';
        return null;
      }),
    };
    logger = {
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiInsightService,
        {
          provide: getRepositoryToken(AiInsight),
          useValue: aiInsightRepository,
        },
        {
          provide: getRepositoryToken(AiJob),
          useValue: aiJobRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: orderRepository,
        },
        {
          provide: getRepositoryToken(ProductStock),
          useValue: productStockRepository,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: logger,
        },
      ],
    }).compile();

    service = module.get<AiInsightService>(AiInsightService);

    // Mock global fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all insights for a branch', async () => {
      aiInsightRepository.find.mockResolvedValue([mockAiInsight]);
      const result = await service.findAll('branch-id');
      expect(result).toEqual([mockAiInsight]);
      expect(aiInsightRepository.find).toHaveBeenCalledWith({
        where: { branch: { id: 'branch-id' } },
        order: { createdAt: 'DESC' },
      });
    });

    it('should handle errors', async () => {
      aiInsightRepository.find.mockRejectedValue(new Error('Database error'));
      await expect(service.findAll('branch-id')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('findOne', () => {
    it('should return an insight by id', async () => {
      aiInsightRepository.findOne.mockResolvedValue(mockAiInsight);
      const result = await service.findOne('insight-id');
      expect(result).toEqual(mockAiInsight);
    });

    it('should throw error if insight not found', async () => {
      aiInsightRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        new HttpException('Insight not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('generateInsights', () => {
    it('should generate insights successfully', async () => {
      // Mock job saving (create -> processing -> completed)
      aiJobRepository.save.mockResolvedValue(mockAiJob);

      // Mock getSalesData (via queryBuilder)
      // Call 1: Daily Sales
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([
        { date: '2023-01-01', totalSales: 100 },
      ]);
      // Call 2: Top Products
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([
        { productName: 'Product 1', totalQuantity: 10, totalRevenue: 1000 },
      ]);

      // Mock getStockData
      productStockRepository.find.mockResolvedValueOnce([]); // Low Stock (via find)
      mockQueryBuilder.getMany.mockResolvedValueOnce([]); // Critical Stock (via queryBuilder)
      productStockRepository.find.mockResolvedValueOnce([]); // High Stock (via find)

      // Mock OpenAI API response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify([
                  {
                    type: 'report_summary',
                    summary: 'Test Summary',
                    metadata: { executive_summary: 'Test', highlights: [] },
                  },
                ]),
              },
            },
          ],
        }),
      });

      const result = await service.generateInsights('branch-id', 'weekly');

      expect(result.success).toBe(true);
      expect(result.message).toBe('AI Insights generated successfully');
      expect(aiJobRepository.save).toHaveBeenCalledTimes(3); // Create, Processing, Completed
      expect(aiInsightRepository.save).toHaveBeenCalled(); // Save insights
    });

    it('should handle AI API errors and return mock data/error', async () => {
      aiJobRepository.save.mockResolvedValue(mockAiJob);

      // Mock data gathering (empty arrays for simplicity)
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      productStockRepository.find.mockResolvedValue([]);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      // Mock OpenAI API failure
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      });

      // The service catches the error inside callOpenAI and returns mock data
      // OR if generateInsights throws, it catches and updates job status to FAILED

      // Let's see callOpenAI implementation: it catches error and returns getMockInsights()
      // So generateInsights should succeed but with mock data?
      // Wait, verify logic:
      // callOpenAI catches error -> returns mock data.
      // So generateInsights continues -> saveInsights -> job completed.

      const result = await service.generateInsights('branch-id');

      expect(result.success).toBe(true);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to call AI API',
        expect.anything(),
      );
    });

    it('should handle errors during data gathering', async () => {
      aiJobRepository.save.mockResolvedValue(mockAiJob);

      // Throw error during sales data fetching
      orderRepository.createQueryBuilder.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(service.generateInsights('branch-id')).rejects.toThrow(
        'Database connection failed',
      );

      expect(aiJobRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: AiJobStatus.FAILED }),
      );
    });
  });
});
