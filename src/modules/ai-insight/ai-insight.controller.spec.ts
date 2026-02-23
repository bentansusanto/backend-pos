import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AiInsightController } from './ai-insight.controller';
import { AiInsightService } from './ai-insight.service';

describe('AiInsightController', () => {
  let controller: AiInsightController;
  let service: AiInsightService;

  const mockAiInsightService = {
    generateInsights: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  const mockInsight = {
    id: 'insight-id',
    type: 'report_summary',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiInsightController],
      providers: [
        {
          provide: AiInsightService,
          useValue: mockAiInsightService,
        },
      ],
    }).compile();

    controller = module.get<AiInsightController>(AiInsightController);
    service = module.get<AiInsightService>(AiInsightService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('generate', () => {
    it('should generate insights', async () => {
      mockAiInsightService.generateInsights.mockResolvedValue({
        success: true,
      });
      const result = await controller.generate({
        branchId: 'branch-id',
        timeRange: 'weekly',
      });
      expect(result).toEqual({ success: true });
      expect(service.generateInsights).toHaveBeenCalledWith(
        'branch-id',
        'weekly',
      );
    });

    it('should throw error if branchId is missing', async () => {
      await expect(controller.generate({} as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all insights with provided branchId', async () => {
      mockAiInsightService.findAll.mockResolvedValue([mockInsight]);
      const result = await controller.findAll('branch-id', {} as any);
      expect(result).toEqual([mockInsight]);
      expect(service.findAll).toHaveBeenCalledWith('branch-id');
    });

    it('should resolve branchId from user if not provided (single branch)', async () => {
      mockAiInsightService.findAll.mockResolvedValue([mockInsight]);
      const req = {
        user: {
          userBranches: [{ branch: { id: 'user-branch-id' } }],
        },
      } as any;

      const result = await controller.findAll(undefined, req);
      expect(result).toEqual([mockInsight]);
      expect(service.findAll).toHaveBeenCalledWith('user-branch-id');
    });

    it('should throw error if user has multiple branches and no branchId provided', async () => {
      const req = {
        user: {
          userBranches: [
            { branch: { id: 'branch-1' } },
            { branch: { id: 'branch-2' } },
          ],
        },
      } as any;

      await expect(controller.findAll(undefined, req)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if user context is missing', async () => {
      await expect(controller.findAll(undefined, {} as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should return an insight by id', async () => {
      mockAiInsightService.findOne.mockResolvedValue(mockInsight);
      const result = await controller.findOne('insight-id');
      expect(result).toEqual(mockInsight);
      expect(service.findOne).toHaveBeenCalledWith('insight-id');
    });
  });
});
