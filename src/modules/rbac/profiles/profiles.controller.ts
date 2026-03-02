import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { WebResponse } from 'src/types/response/index.type';
import { User } from '../users/entities/user.entity';
import { CreateProfileDto, UpdateProfileDto } from './dto/create-profile.dto';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: User,
    @Body() createProfileDto: CreateProfileDto,
  ): Promise<WebResponse> {
    const result = await this.profilesService.create(user.id, createProfileDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async findOne(@CurrentUser() user: User): Promise<WebResponse> {
    const result = await this.profilesService.findByUserId(user.id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Get('user/:userId')
  @HttpCode(HttpStatus.OK)
  async findByUserId(@Param('userId') userId: string): Promise<WebResponse> {
    const result = await this.profilesService.findByUserId(userId);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Put('update/:id')
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<WebResponse> {
    const result = await this.profilesService.update(
      user.id,
      id,
      updateProfileDto,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }
}
