import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { WebResponse } from 'src/types/response/index.type';
import { User } from '../rbac/users/entities/user.entity';
import {
  ClosePosSessionDto,
  OpenPosSessionDto,
} from './dto/create-pos-session.dto';
import { PosSessionsService } from './pos-sessions.service';

@Controller('pos-sessions')
export class PosSessionsController {
  constructor(private readonly posSessionsService: PosSessionsService) {}


  @Post()
  @HttpCode(HttpStatus.CREATED)
  async openSession(
    @Body() openPosSessionDto: OpenPosSessionDto,
    @CurrentUser() user: User,
  ): Promise<WebResponse> {
    const result = await this.posSessionsService.openSession(
      openPosSessionDto,
      user,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Patch(':id/close')
  @HttpCode(HttpStatus.OK)
  async closeSession(
    @Param('id') id: string,
    @Body() closePosSessionDto: ClosePosSessionDto,
    @CurrentUser() user: User,
  ): Promise<WebResponse> {
    const result = await this.posSessionsService.closeSession(
      id,
      closePosSessionDto,
      user,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }


  @Get('active')
  @HttpCode(HttpStatus.OK)
  async getActiveSession(@CurrentUser() user: User): Promise<WebResponse> {
    const result = await this.posSessionsService.getActiveSession(user);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Get(':id/summary')
  @HttpCode(HttpStatus.OK)
  async getSessionSummary(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.posSessionsService.getSessionSummary(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<WebResponse> {
    const result = await this.posSessionsService.findAll();
    return {
      message: result.message,
      data: result.datas,
    };
  }
}
