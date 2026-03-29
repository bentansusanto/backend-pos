import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../branches/entities/branch.entity';
import { AiInsightService } from './ai-insight.service';

@Injectable()
export class AiInsightSchedulerService {
  private readonly logger = new Logger(AiInsightSchedulerService.name);

  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    private readonly aiInsightService: AiInsightService,
  ) {}

  // Run every day at 1:00 AM (production)
  @Cron(CronExpression.EVERY_MINUTE)
  async handleDailyAiInsights() {
    this.logger.log('Starting automated daily AI Insight generation for all branches...');

    try {
      const branches = await this.branchRepository.find({
        where: { isActive: true },
      });

      this.logger.log(`Found ${branches.length} active branches to process.`);

      for (const branch of branches) {
        try {
          this.logger.log(`Generating insights for branch: ${branch.name} (${branch.id})`);
          // Use 'monthly' range to ensure rich 30-day context in the daily report
          await this.aiInsightService.generateInsights(branch.id, 'monthly');
          this.logger.log(`Successfully generated insights for branch: ${branch.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to generate insights for branch ${branch.id}: ${error.message}`,
          );
        }
      }

      this.logger.log('Automated daily AI Insight generation completed.');
    } catch (error) {
      this.logger.error(`Scheduler failed to fetch branches: ${error.message}`);
    }
  }

  // Optional: A helper to trigger it manually via code for testing
  async triggerNow() {
    return this.handleDailyAiInsights();
  }
}
