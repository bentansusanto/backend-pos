import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { Permissions } from 'src/common/decorator/permissions.decorator';
import { Roles } from 'src/common/decorator/roles.decorator';
import { WebResponse } from 'src/types/response/index.type';
import { CreateUserByOwnerDto, CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // create user
  @Roles('owner')
  @Permissions('users:create')
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserByOwnerDto): Promise<WebResponse> {
    const result = await this.usersService.createUser(createUserDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // get all users
  @Roles('owner')
  @Permissions('users:read')
  @Get('find-all')
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<WebResponse> {
    const result = await this.usersService.findAll();
    return {
      message: result.message,
      data: result.datas,
    };
  }

  // get user by id for access dashboard
  @Permissions('users:read')
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getUser(@CurrentUser() user: User): Promise<WebResponse> {
    const result = await this.usersService.findOne(user.id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // get user by id
  @Permissions('users:read')
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.usersService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // update user
  @Roles('super_admin', 'owner')
  @Permissions('users:update')
  @Put('update/:id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<WebResponse> {
    const result = await this.usersService.update(id, updateUserDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // soft delete user
  @Roles('super_admin', 'owner')
  @Permissions('users:delete')
  @Delete('delete/:id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.usersService.remove(id);
    return {
      message: result.message,
      data: result.data,
    };
  }
}
