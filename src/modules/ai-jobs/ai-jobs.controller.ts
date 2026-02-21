import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AiJobsService } from './ai-jobs.service';
import { CreateAiJobDto } from './dto/create-ai-job.dto';
import { UpdateAiJobDto } from './dto/update-ai-job.dto';

@Controller('ai-jobs')
export class AiJobsController {
  constructor(private readonly aiJobsService: AiJobsService) {}

  @Post()
  create(@Body() createAiJobDto: CreateAiJobDto) {
    return this.aiJobsService.create(createAiJobDto);
  }

  @Get()
  findAll() {
    return this.aiJobsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.aiJobsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAiJobDto: UpdateAiJobDto) {
    return this.aiJobsService.update(+id, updateAiJobDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.aiJobsService.remove(+id);
  }
}
