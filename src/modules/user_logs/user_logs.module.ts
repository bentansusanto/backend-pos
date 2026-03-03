import { Module } from '@nestjs/common';
import { UserLogsService } from './user_logs.service';
import { UserLogsController } from './user_logs.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserLog } from './entities/user_log.entity';

@Module({
  controllers: [UserLogsController],
  providers: [UserLogsService],
  exports: [UserLogsService],
  imports: [TypeOrmModule.forFeature([UserLog])],
})
export class UserLogsModule {}
