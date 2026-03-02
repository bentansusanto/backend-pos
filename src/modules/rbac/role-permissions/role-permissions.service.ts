import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { errorPermissionMessage } from 'src/libs/errors/error_permission';
import { errorRolePermissionMessage } from 'src/libs/errors/error_role_permission';
import { successRolePermissionMessage } from 'src/libs/success/success_role_permission';
import { WebResponse } from 'src/types/response/index.type';
import { RolePermissionResponse } from 'src/types/response/role-permission.type';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { PermissionsService } from '../permissions/permissions.service';
import { RolesService } from '../roles/roles.service';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import {
  CreateRolePermissionDto,
  UpdateRolePermissionDto,
} from './dto/create-role-permission.dto';
import { RolePermission } from './entities/role_permission.entity';

@Injectable()
export class RolePermissionsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    private readonly roleService: RolesService,
    private readonly permissionService: PermissionsService,
  ) {}

  // create role permission
  async create(
    createRolePermissionDto: CreateRolePermissionDto,
  ): Promise<RolePermissionResponse> {
    try {
      const role = await this.roleService.findOne(
        createRolePermissionDto.role_id,
      );
      if (!role) {
        throw new Error('Role not found');
      }
      const permission = await this.permissionService.findOne(
        createRolePermissionDto.permission_id,
      );
      if (!permission) {
        throw new Error('Permission not found');
      }
      const rolePermission = this.rolePermissionRepository.create({
        role: {
          id: createRolePermissionDto.role_id,
        },
        permission: {
          id: createRolePermissionDto.permission_id,
        },
      });
      await this.rolePermissionRepository.save(rolePermission);
      this.logger.debug(
        `Role permission created successfully: ${rolePermission.id}`,
      );
      return {
        message: 'Role permission created successfully',
        data: {
          id: rolePermission.id,
          role_id: rolePermission.role.id,
          permission_id: rolePermission.permission.id,
          createdAt: rolePermission.createdAt,
          updatedAt: rolePermission.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(
        errorPermissionMessage.ERR_CREATE_PERMISSION_FAILED,
        error,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          Error: {
            field: 'general',
            body: errorPermissionMessage.ERR_CREATE_PERMISSION_FAILED,
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // find all role permissions
  async findAll(): Promise<RolePermissionResponse> {
    try {
      // find all role permissions
      const rolePermissions = await this.rolePermissionRepository.find({
        relations: ['role', 'permission'],
      });
      if (rolePermissions.length === 0) {
        this.logger.warn(
          errorRolePermissionMessage.ERR_FIND_ROLE_PERMISSION_FAILED,
        );
        return {
          message: errorRolePermissionMessage.ERR_FIND_ROLE_PERMISSION_FAILED,
          datas: [],
        };
      }
      this.logger.debug(
        `Role permissions found successfully: ${rolePermissions.length}`,
      );
      return {
        message: 'Role permissions found successfully',
        datas: rolePermissions.map((rolePermission) => ({
          id: rolePermission.id,
          role_id: rolePermission.role.id,
          permission_id: rolePermission.permission.id,
          createdAt: rolePermission.createdAt,
          updatedAt: rolePermission.updatedAt,
        })),
      };
    } catch (error) {
      this.logger.error(
        errorRolePermissionMessage.ERR_FIND_ROLE_PERMISSION_FAILED,
        error,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          Error: {
            field: 'general',
            body: errorRolePermissionMessage.ERR_FIND_ROLE_PERMISSION_FAILED,
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // find role permission by id
  async findOne(id: string): Promise<RolePermissionResponse> {
    try {
      // find role permission by id
      const rolePermission = await this.rolePermissionRepository.findOne({
        where: {
          id,
        },
        relations: ['role', 'permission'],
      });
      if (!rolePermission) {
        throw new Error('Role permission not found');
      }
      this.logger.debug(
        `Role permission found successfully: ${rolePermission.id}`,
      );
      return {
        message: 'Role permission found successfully',
        data: {
          id: rolePermission.id,
          role_id: rolePermission.role.id,
          permission_id: rolePermission.permission.id,
          createdAt: rolePermission.createdAt,
          updatedAt: rolePermission.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(
        errorRolePermissionMessage.ERR_FIND_ROLE_PERMISSION_FAILED,
        error,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          Error: {
            field: 'general',
            body: errorRolePermissionMessage.ERR_FIND_ROLE_PERMISSION_FAILED,
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // update role permission by id
  async update(
    id: string,
    updateRolePermissionDto: UpdateRolePermissionDto,
  ): Promise<RolePermissionResponse> {
    try {
      // find role permission by id
      const findRolePermission = await this.findOne(id);

      // check role and permission exists
      const [findRole, findPermission] = await Promise.all([
        this.roleService.findOne(updateRolePermissionDto.role_id),
        this.permissionService.findOne(updateRolePermissionDto.permission_id),
      ]);

      // update role permission
      await this.rolePermissionRepository.update(id, {
        role: {
          id: findRole.data.id,
        },
        permission: {
          id: findPermission.data.id,
        },
      });
      this.logger.debug(
        `Role permission updated successfully: ${findPermission.data.id}`,
      );
      return {
        message: 'Role permission updated successfully',
        data: {
          id: findRolePermission.data.id,
          role_id: findRolePermission.data.role_id,
          permission_id: findRolePermission.data.permission_id,
          createdAt: findRolePermission.data.createdAt,
          updatedAt: findRolePermission.data.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(
        errorRolePermissionMessage.ERR_UPDATE_ROLE_PERMISSION_FAILED,
        error,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          Error: {
            field: 'general',
            body: errorRolePermissionMessage.ERR_UPDATE_ROLE_PERMISSION_FAILED,
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string): Promise<RolePermissionResponse> {
    try {
      // find role permission by id
      const findRolePermission = await this.findOne(id);

      // delete role permission
      await this.rolePermissionRepository.delete(id);
      this.logger.debug(
        `Role permission deleted successfully: ${findRolePermission.data.id}`,
      );
      return {
        message: successRolePermissionMessage.SUCCESS_DELETE_ROLE_PERMISSION,
      };
    } catch (error) {
      this.logger.error(
        errorRolePermissionMessage.ERR_DELETE_ROLE_PERMISSION_FAILED,
        error,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          Error: {
            field: 'general',
            body: errorRolePermissionMessage.ERR_DELETE_ROLE_PERMISSION_FAILED,
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // assign permissions to role (bulk)
  async assignPermissions(
    assignPermissionsDto: AssignPermissionsDto,
  ): Promise<WebResponse> {
    try {
      const { role_id, permission_ids } = assignPermissionsDto;

      // check if role exists
      const role = await this.roleService.findOne(role_id);
      if (!role) {
        throw new Error('Role not found');
      }

      // get current permissions
      const currentRolePermissions = await this.rolePermissionRepository.find({
        where: { role: { id: role_id } },
        relations: ['permission'],
      });

      const currentPermissionIds = currentRolePermissions.map(
        (rp) => rp.permission.id,
      );

      // determine permissions to add
      const permissionsToAdd = permission_ids.filter(
        (id) => !currentPermissionIds.includes(id),
      );

      // determine permissions to remove
      const permissionsToRemove = currentRolePermissions.filter(
        (rp) => !permission_ids.includes(rp.permission.id),
      );

      // run inside a transaction: remove first, then add (avoids unique constraint issues)
      // entities are created OUTSIDE the transaction so @BeforeInsert fires and IDs are generated
      const newRolePermissions = permissionsToAdd.map((permissionId) =>
        this.rolePermissionRepository.create({
          role: { id: role_id },
          permission: { id: permissionId },
        }),
      );

      await this.rolePermissionRepository.manager.transaction(
        async (manager) => {
          if (permissionsToRemove.length > 0) {
            await manager.remove(RolePermission, permissionsToRemove);
          }

          if (newRolePermissions.length > 0) {
            // insert one by one to ensure @BeforeInsert fires per entity
            for (const entity of newRolePermissions) {
              await manager.save(RolePermission, entity);
            }
          }
        },
      );

      this.logger.debug(
        `Permissions assigned to role ${role_id}: +${permissionsToAdd.length}, -${permissionsToRemove.length}`,
      );

      return {
        message: 'Permissions assigned successfully',
        data: null,
      };
    } catch (error) {
      this.logger.error('Failed to assign permissions', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          Status: HttpStatus.INTERNAL_SERVER_ERROR,
          Message: 'Internal server error',
          Error: {
            field: 'general',
            body: 'Failed to assign permissions',
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
