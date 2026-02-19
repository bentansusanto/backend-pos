import { Module } from '@nestjs/common';
import { AiJobsService } from './ai-jobs.service';
import { AiJobsController } from './ai-jobs.controller';

@Module({
  controllers: [AiJobsController],
  providers: [AiJobsService],
})
export class AiJobsModule {}
