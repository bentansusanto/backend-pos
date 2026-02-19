import { Injectable } from '@nestjs/common';
import { CreateAiJobDto } from './dto/create-ai-job.dto';
import { UpdateAiJobDto } from './dto/update-ai-job.dto';

@Injectable()
export class AiJobsService {
  create(createAiJobDto: CreateAiJobDto) {
    return 'This action adds a new aiJob';
  }

  findAll() {
    return `This action returns all aiJobs`;
  }

  findOne(id: number) {
    return `This action returns a #${id} aiJob`;
  }

  update(id: number, updateAiJobDto: UpdateAiJobDto) {
    return `This action updates a #${id} aiJob`;
  }

  remove(id: number) {
    return `This action removes a #${id} aiJob`;
  }
}
