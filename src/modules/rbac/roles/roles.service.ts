import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AuthResponse } from 'src/types/response/auth.type';
import { Logger, loggers } from 'winston';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Repository } from 'typeorm';
import { errorRoleMessage } from 'src/libs/errors/error_role';
import { successRoleMessage } from 'src/libs/success/success_role';
import { RoleResponse } from 'src/types/response/role.type';

@Injectable()
export class RolesService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}
  create(createRoleDto: CreateRoleDto) {
    return 'This action adds a new role';
  }

  // find all roles
  async findAll(): Promise<RoleResponse> {
    try {
      const roles = await this.roleRepository.find();
      if (roles.length === 0) {
        this.logger.warn(
          errorRoleMessage.ERROR_FIND_ALL_ROLE,
          'No roles found',
        );
        throw new HttpException(
          errorRoleMessage.ERROR_FIND_ALL_ROLE,
          HttpStatus.NOT_FOUND,
        );
      }
      this.logger.debug(successRoleMessage.SUCCESS_FIND_ALL_ROLE);
      return {
        message: successRoleMessage.SUCCESS_FIND_ALL_ROLE,
        datas: roles.map((role) => ({
          id: role.id,
          name: role.name,
          code: role.code,
          description: role.description,
          self_registered: role.self_registered,
          createdAt: role.createdAt,
          updatedAt: role.updatedAt,
        })),
      };
    } catch (error) {
      this.logger.error(errorRoleMessage.ERROR_FIND_ALL_ROLE, error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errorRoleMessage.ERROR_FIND_ALL_ROLE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // find role by id
  async findOne(id: string): Promise<RoleResponse> {
    try {
      const role = await this.roleRepository.findOne({
        where: {
          id,
        },
      });
      if (!role) {
        this.logger.warn(
          errorRoleMessage.ERROR_FIND_ROLE,
          `Role with id ${id} not found`,
        );
        throw new HttpException(
          errorRoleMessage.ERROR_FIND_ROLE,
          HttpStatus.NOT_FOUND,
        );
      }
      this.logger.debug(successRoleMessage.SUCCESS_FIND_ROLE);
      return {
        message: successRoleMessage.SUCCESS_FIND_ROLE,
        data: {
          id: role.id,
          name: role.name,
          code: role.code,
          description: role.description,
          self_registered: role.self_registered,
          createdAt: role.createdAt,
          updatedAt: role.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errorRoleMessage.ERROR_FIND_ROLE, error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errorRoleMessage.ERROR_FIND_ROLE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  update(id: number, updateRoleDto: UpdateRoleDto) {
    return `This action updates a #${id} role`;
  }

  remove(id: number) {
    return `This action removes a #${id} role`;
  }
}
