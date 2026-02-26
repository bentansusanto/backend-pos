import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { Roles } from 'src/common/decorator/roles.decorator';
import { WebResponse } from 'src/types/response/index.type';

@Controller('permissions')
@Roles('admin')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createPermissionDto: CreatePermissionDto):Promise<WebResponse> {
    const result = await this.permissionsService.create(createPermissionDto);
    return{
      message: result.message,
      data: result.data,
    }
  }

  @Get('find-all')
  @HttpCode(HttpStatus.OK)
  async findAll():Promise<WebResponse> {
    const result = await this.permissionsService.findAll();
    return{
      message: result.message,
      data: result.data,
    }
  }

  @Get('find-one/:id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string):Promise<WebResponse> {
    const result = await this.permissionsService.findOne(id);
    return{
      message: result.message,
      data: result.data,
    }
  }

  @Put('update/:id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() updatePermissionDto: UpdatePermissionDto):Promise<WebResponse> {
    const result = await this.permissionsService.update(id, updatePermissionDto);
    return{
      message: result.message,
      data: result.data,
    }
  }

  @Delete('delete/:id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string):Promise<WebResponse> {
    const result = await this.permissionsService.remove(id);
    return{
      message: result.message,
      data: result.data,
    }
  }
}
