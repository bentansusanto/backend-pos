import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { WebResponse } from 'src/types/response/index.type';
import { Permissions } from 'src/common/decorator/permissions.decorator';
import { Roles } from 'src/common/decorator/roles.decorator';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Roles('admin', 'owner')
  @Permissions('roles:read')
  @Get('find-all')
  @HttpCode(HttpStatus.OK)
  async findAll():Promise<WebResponse> {
    const result = await this.rolesService.findAll();
    return{
      message: result.message,
      data: result.datas,
    }
  }

  @Roles('admin', 'owner')
  @Permissions('roles:read')
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string):Promise<WebResponse> {
    const result = await this.rolesService.findOne(id);
    return{
      message: result.message,
      data: result.data,
    }
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(+id, updateRoleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(+id);
  }
}
