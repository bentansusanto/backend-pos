import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ActionType, EntityType } from './entities/user_log.entity';
import { UserLogsService } from './user_logs.service';

@UseGuards(JwtAuthGuard)
@Controller('user-logs')
export class UserLogsController {
  constructor(private readonly userLogsService: UserLogsService) {}

  /** GET /user-logs?branchId=&userId=&entityType=&action=&limit=&page= */
  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(
    @Query('branchId') branchId?: string,
    @Query('userId') userId?: string,
    @Query('entityType') entityType?: EntityType,
    @Query('action') action?: ActionType,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ) {
    return this.userLogsService.findAll(
      branchId,
      userId,
      entityType,
      action,
      limit ? Number(limit) : 50,
      page ? Number(page) : 1,
    );
  }

  /** GET /user-logs/user/:userId — activity per user */
  @Get('user/:userId')
  @HttpCode(HttpStatus.OK)
  findByUser(@Param('userId') userId: string, @Query('limit') limit?: number) {
    return this.userLogsService.findByUser(userId, limit ? Number(limit) : 20);
  }

  /** GET /user-logs/:id */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string) {
    return this.userLogsService.findOne(id);
  }
}
