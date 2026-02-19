import { PartialType } from '@nestjs/mapped-types';
import { CreateAiJobDto } from './create-ai-job.dto';

export class UpdateAiJobDto extends PartialType(CreateAiJobDto) {}
