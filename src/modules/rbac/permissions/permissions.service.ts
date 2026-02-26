import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { errorPermissionMessage } from 'src/libs/errors/error_permission';
import { successPermissionMessage } from 'src/libs/success/success_permission';
import { PermissionResponse } from 'src/types/response/permission.type';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { Permission } from './entities/permission.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}
  // create permission
  async create(
    createPermissionDto: CreatePermissionDto,
  ): Promise<PermissionResponse> {
    try {
      // check if permission already exists
      const permission = await this.permissionRepository.findOne({
        where: {
          module: createPermissionDto.module,
        },
      });
      if (permission) {
        throw new HttpException(
          {
            Error: {
              field: 'module',
              body: errorPermissionMessage.ERR_PERMISSION_ALREADY_EXISTS,
            },
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      // create permission
      const newPermission =
        this.permissionRepository.create(createPermissionDto);
      await this.permissionRepository.save(newPermission);
      this.logger.debug(
        successPermissionMessage.SUCCESS_PERMISSION_CREATED,
        newPermission.id,
      );
      return {
        message: successPermissionMessage.SUCCESS_PERMISSION_CREATED,
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

  // find all permissions
  async findAll(): Promise<PermissionResponse> {
    try {
      // find all permissions
      const permissions = await this.permissionRepository.find();
      if (permissions.length === 0) {
        throw new HttpException(
          {
            Error: {
              field: 'general',
              body: errorPermissionMessage.ERR_PERMISSION_LIST_FOUND_FAILED,
            },
          },
          HttpStatus.NOT_FOUND,
        );
      }
      this.logger.debug(
        successPermissionMessage.SUCCESS_PERMISSION_LIST_FOUND,
        permissions.length,
      );
      return {
        message: successPermissionMessage.SUCCESS_PERMISSION_LIST_FOUND,
        datas: permissions.map((item) => ({
          id: item.id,
          module: item.module,
          action: item.action,
          description: item.description,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
      };
    } catch (error) {
      this.logger.error(
        errorPermissionMessage.ERR_PERMISSION_LIST_FOUND_FAILED,
        error.message,
      );
      throw new HttpException(
        {
          Error: {
            field: 'general',
            body: errorPermissionMessage.ERR_PERMISSION_LIST_FOUND_FAILED,
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // find one permissions
  async findOne(id: string):Promise<PermissionResponse> {
    try {
      // find one permission
      const permission = await this.permissionRepository.findOne({
        where: {
          id,
        },
      });
      if (!permission) {
        throw new HttpException(
          {
            Error: {
              field: 'general',
              body: errorPermissionMessage.ERR_PERMISSION_NOT_FOUND,
            },
          },
          HttpStatus.NOT_FOUND,
        );
      }
      this.logger.debug(
        successPermissionMessage.SUCCESS_PERMISSION_FOUND,
        permission.id,
      );
      return {
        message: successPermissionMessage.SUCCESS_PERMISSION_FOUND,
        data: {
          id: permission.id,
          module: permission.module,
          action: permission.action,
          description: permission.description,
          createdAt: permission.createdAt,
          updatedAt: permission.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(
        errorPermissionMessage.ERR_PERMISSION_NOT_FOUND,
        error.message,
      );
      throw new HttpException(
        {
          Error: {
            field: 'general',
            body: errorPermissionMessage.ERR_PERMISSION_NOT_FOUND,
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // update permission
  async update(id: string, updatePermissionDto: UpdatePermissionDto):Promise<PermissionResponse> {
    try {
      // find one permission
      const permission = await this.findOne(id);
      // update permission
      await this.permissionRepository.update(id, updatePermissionDto);
      this.logger.debug(
        successPermissionMessage.SUCCESS_PERMISSION_UPDATED,
        permission.data.id,
      );
      return {
        message: successPermissionMessage.SUCCESS_PERMISSION_UPDATED,
      };
    } catch (error) {
      this.logger.error(
        errorPermissionMessage.ERR_UPDATE_PERMISSION_FAILED,
        error.message,
      );
      throw new HttpException(
        {
          Error: {
            field: 'general',
            body: errorPermissionMessage.ERR_UPDATE_PERMISSION_FAILED,
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // delete permission
  async remove(id: string):Promise<PermissionResponse> {
    try {
      // find one permission
      const permission = await this.findOne(id);
      // delete permission
      await this.permissionRepository.delete(id);
      this.logger.debug(
        successPermissionMessage.SUCCESS_PERMISSION_DELETED,
        permission.data.id,
      );
      return {
        message: successPermissionMessage.SUCCESS_PERMISSION_DELETED,
      };
    } catch (error) {
      this.logger.error(
        errorPermissionMessage.ERR_DELETE_PERMISSION_FAILED,
        error.message,
      );
      throw new HttpException(
        {
          Error: {
            field: 'general',
            body: errorPermissionMessage.ERR_DELETE_PERMISSION_FAILED,
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
