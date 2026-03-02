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
import { Roles } from 'src/common/decorator/roles.decorator';
import { WebResponse } from 'src/types/response/index.type';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import {
  CreateRolePermissionDto,
  UpdateRolePermissionDto,
} from './dto/create-role-permission.dto';
import { RolePermissionsService } from './role-permissions.service';

@Controller('role-permissions')
@Roles('admin', 'owner')
export class RolePermissionsController {
  constructor(
    private readonly rolePermissionsService: RolePermissionsService,
  ) {}

  @Post('assign-permissions')
  @HttpCode(HttpStatus.OK)
  async assignPermissions(
    @Body() assignPermissionsDto: AssignPermissionsDto,
  ): Promise<WebResponse> {
    return this.rolePermissionsService.assignPermissions(assignPermissionsDto);
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createRolePermissionDto: CreateRolePermissionDto,
  ): Promise<WebResponse> {
    const result = await this.rolePermissionsService.create(
      createRolePermissionDto,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Get('find-all')
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<WebResponse> {
    const result = await this.rolePermissionsService.findAll();
    return {
      message: result.message,
      data: result.datas,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.rolePermissionsService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Put('update/:id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateRolePermissionDto: UpdateRolePermissionDto,
  ): Promise<WebResponse> {
    const result = await this.rolePermissionsService.update(
      id,
      updateRolePermissionDto,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Delete('delete/:id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.rolePermissionsService.remove(id);
    return {
      message: result.message,
    };
  }
}
