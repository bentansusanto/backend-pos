import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { AuthResponse } from 'src/types/response/auth.type';
import { WebResponse } from 'src/types/response/index.type';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { User } from './entities/user.entity';
import { Roles } from 'src/common/decorator/roles.decorator';
import { Permissions } from 'src/common/decorator/permissions.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}


  // create user
  @Roles('super_admin', 'owner')
  @Permissions('create_user')
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto):Promise<WebResponse> {
    const result = await this.usersService.createUser(createUserDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // get all users
  @Roles('super_admin', 'owner')
  @Permissions('read_user')
  @Get('find-all')
  @HttpCode(HttpStatus.OK)
  async findAll():Promise<WebResponse> {
    const result = await this.usersService.findAll();
    return {
      message: result.message,
      data: result.datas,
    };
  }

  // get user by id
  @Roles('super_admin', 'owner')
  @Permissions('read_user')
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string):Promise<WebResponse> {
    const result = await this.usersService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // get user by id for access dashboard
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getUser(@CurrentUser() user: User):Promise<WebResponse> {
    const result = await this.usersService.findOne(user.id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // update user
  @Roles('super_admin', 'owner')
  @Permissions('update_user')
  @Put('update/:id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto):Promise<WebResponse> {
    const result = await this.usersService.update(id, updateUserDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // soft delete user
  @Roles('super_admin', 'owner')
  @Permissions('delete_user')
  @Delete('delete/:id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string):Promise<WebResponse> {
    const result = await this.usersService.remove(id);
    return {
      message: result.message,
      data: result.data,
    };
  }
}
