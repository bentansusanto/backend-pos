import { PartialType } from '@nestjs/mapped-types';
import { CreateUserLogDto } from './create-user_log.dto';

export class UpdateUserLogDto extends PartialType(CreateUserLogDto) {}
