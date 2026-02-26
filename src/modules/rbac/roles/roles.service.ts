import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { errorRoleMessage } from 'src/libs/errors/error_role';
import { successRoleMessage } from 'src/libs/success/success_role';
import { RoleResponse } from 'src/types/response/role.type';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { CreateRoleDto, UpdateRoleDto } from './dto/create-role.dto';
import { Role } from './entities/role.entity';

@Injectable()
export class RolesService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}
  // create role
  async create(createRoleDto: CreateRoleDto): Promise<RoleResponse> {
    try {
      // check if role code already exists
      const roleCode = await this.roleRepository.findOne({
        where: { code: createRoleDto.code },
      });
      if (roleCode) {
        this.logger.warn(
          errorRoleMessage.ERROR_CREATE_ROLE,
          'Role code already exists',
        );
        throw new HttpException(
          errorRoleMessage.ERROR_CREATE_ROLE,
          HttpStatus.BAD_REQUEST,
        );
      }
      // create role
      const role = this.roleRepository.create({
        ...createRoleDto,
      });
      await this.roleRepository.save(role);
      this.logger.debug(successRoleMessage.SUCCESS_CREATE_ROLE);
      return {
        message: successRoleMessage.SUCCESS_CREATE_ROLE,
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
      this.logger.error(errorRoleMessage.ERROR_CREATE_ROLE, error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errorRoleMessage.ERROR_CREATE_ROLE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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

  // update role
  async update(
    id: string,
    updateRoleDto: UpdateRoleDto,
  ): Promise<RoleResponse> {
    try {
      // check if role exists
      const role = await this.findOne(id);
      // update role
      await this.roleRepository.update(id, {
        ...updateRoleDto,
      });
      this.logger.debug(successRoleMessage.SUCCESS_UPDATE_ROLE);
      return {
        message: successRoleMessage.SUCCESS_UPDATE_ROLE,
        data: {
          id: role.data.id,
          name: role.data.name,
          code: role.data.code,
          description: role.data.description,
          self_registered: role.data.self_registered,
          createdAt: role.data.createdAt,
          updatedAt: role.data.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(errorRoleMessage.ERROR_UPDATE_ROLE, error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errorRoleMessage.ERROR_UPDATE_ROLE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // remove role
  async remove(id: string): Promise<RoleResponse> {
    try {
      // check if role exists
      const role = await this.findOne(id);
      // remove role
      await this.roleRepository.delete(id);
      this.logger.debug(successRoleMessage.SUCCESS_DELETE_ROLE, role.data.id);
      return {
        message: successRoleMessage.SUCCESS_DELETE_ROLE,
      };
    } catch (error) {
      this.logger.error(errorRoleMessage.ERROR_DELETE_ROLE, error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errorRoleMessage.ERROR_DELETE_ROLE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
