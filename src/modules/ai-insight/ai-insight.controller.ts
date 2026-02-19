import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { AiInsightService } from './ai-insight.service';

@Controller('ai-insight')
export class AiInsightController {
  constructor(private readonly aiInsightService: AiInsightService) {}

  @Post('generate')
  async generate(@Body('branchId') branchId: string) {
    if (!branchId) {
      throw new BadRequestException('branchId is required');
    }
    return this.aiInsightService.generateInsights(branchId);
  }

  @Get()
  async findAll(@Query('branchId') branchId: string) {
    if (!branchId) {
      throw new BadRequestException('branchId is required as query parameter');
    }
    return this.aiInsightService.findAll(branchId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.aiInsightService.findOne(id);
  }
}
