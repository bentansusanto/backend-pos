import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentBranchId } from 'src/common/decorator/branch.decorator';
import { AiInsightService } from './ai-insight.service';

@Controller('ai-insight')
export class AiInsightController {
  constructor(private readonly aiInsightService: AiInsightService) {}

  @Post('generate')
  async generate(
    @Body() body: { branchId?: string; timeRange?: string },
    @CurrentBranchId() headerBranchId?: string,
  ) {
    const branchId = body.branchId || headerBranchId;
    if (!branchId) {
      throw new BadRequestException('branchId is required');
    }
    return this.aiInsightService.generateInsights(branchId, body.timeRange);
  }

  @Get('find')
  async findAll(
    @Query('branchId') queryBranchId?: string,
    @CurrentBranchId() headerBranchId?: string,
  ) {
    const branchId = queryBranchId || headerBranchId;
    if (!branchId) {
      throw new BadRequestException('branchId is required');
    }
    return this.aiInsightService.findAll(branchId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.aiInsightService.findOne(id);
  }
}
