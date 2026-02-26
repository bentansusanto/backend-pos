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
import { Permissions } from 'src/common/decorator/permissions.decorator';
import { Roles } from 'src/common/decorator/roles.decorator';
import { WebResponse } from 'src/types/response/index.type';
import { CreateRoleDto, UpdateRoleDto } from './dto/create-role.dto';
import { RolesService } from './roles.service';

@Controller('roles')
@Roles('admin', 'owner')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createRoleDto: CreateRoleDto): Promise<WebResponse> {
    const result = await this.rolesService.create(createRoleDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Permissions('roles:read')
  @Get('find-all')
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<WebResponse> {
    const result = await this.rolesService.findAll();
    return {
      message: result.message,
      data: result.datas,
    };
  }

  @Permissions('roles:read')
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.rolesService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Put(':id')
  @Permissions('roles:update')
  async update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<WebResponse> {
    const result = await this.rolesService.update(id, updateRoleDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Permissions('roles:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.rolesService.remove(id);
    return {
      message: result.message,
    };
  }
}
