import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Permissions } from 'src/common/decorator/permissions.decorator';
import { Roles } from 'src/common/decorator/roles.decorator';
import { AiInsightService } from './ai-insight.service';

@Controller('ai-insight')
export class AiInsightController {
  constructor(private readonly aiInsightService: AiInsightService) {}

  @Roles('owner')
  @Permissions('ai_insight:generate')
  @Post('generate')
  async generate(@Body() body: { branchId: string; timeRange?: string }) {
    if (!body.branchId) {
      throw new BadRequestException('branchId is required');
    }
    return this.aiInsightService.generateInsights(
      body.branchId,
      body.timeRange,
    );
  }

  @Roles('owner')
  @Permissions('ai_insight:read')
  @Get('find')
  async findAll(@Query('branchId') branchId: string, @Req() req: Request) {
    const finalBranchId = this.resolveBranchId(branchId, req);
    return this.aiInsightService.findAll(finalBranchId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.aiInsightService.findOne(id);
  }

  private resolveBranchId(branchId: string, req: Request): string {
    if (branchId) return branchId;

    const user: any = (req as any).user;
    if (!user) {
      throw new BadRequestException('User context not found');
    }

    // If user has only one branch, use it
    if (user.userBranches?.length === 1) {
      return user.userBranches[0].branch.id;
    }

    // If user has multiple branches or none, require explicit selection
    if (user.userBranches?.length > 1) {
      throw new BadRequestException(
        'Please select a specific branch to analyze',
      );
    }

    throw new BadRequestException(
      'Branch ID is required and no default branch found',
    );
  }
}
