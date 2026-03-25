import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { errorRoleMessage } from 'src/libs/errors/error_role';
import { errUserMessage } from 'src/libs/errors/error_user';
import { successUserMessage } from 'src/libs/success/success_user';
import { AuthResponse } from 'src/types/response/auth.type';
import { Repository } from 'typeorm';
import { Role } from '../roles/entities/role.entity';
import { RolesService } from '../roles/roles.service';
import {
  CreateUserByOwnerDto,
  CreateUserDto,
  UpdateUserDto,
} from './dto/create-user.dto';
import { User } from './entities/user.entity';

import { UserBranch } from 'src/modules/branches/entities/user-branch.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    @InjectRepository(UserBranch)
    private readonly userBranchRepository: Repository<UserBranch>,
    private readonly rolesService: RolesService,
  ) {}

  // create user for super admin and owner
  async create(createUserDto: CreateUserDto, role?: Role): Promise<any> {
    // generate verify code
    const tokens = crypto.randomBytes(40).toString('hex');
    const tokenVerify = `${tokens}-${Date.now()}`;

    // hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      verify_code: tokenVerify,
      exp_verify_at: new Date(Date.now() + 10 * 60 * 1000),
      role,
    });
    const saveUser = await this.userRepository.save(user);
    const { password, ...result } = saveUser;
    return result;
  }

  // find role by code
  async findRole(code: string): Promise<Role> {
    return await this.roleRepository.findOne({
      where: { code },
    });
  }

  // count users by role
  async countByRole(code: string): Promise<number> {
    return await this.userRepository.count({
      where: { role: { code } },
    });
  }

  // create user for admin, staff, cashier
  async createUser(
    createUserDto: CreateUserByOwnerDto,
    creator: User,
  ): Promise<AuthResponse> {
    // check user already exists
    const userExists = await this.findEmail(createUserDto.email);
    if (userExists) {
      throw new HttpException(
        errUserMessage.USER_ALREADY_EXISTS,
        HttpStatus.BAD_REQUEST,
      );
    }

    const role = await this.roleRepository.findOne({
      where: { id: createUserDto.role_id },
    });
    if (!role) {
      throw new HttpException(
        errorRoleMessage.ERROR_FIND_ROLE,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Role-based creation restrictions
    if (creator.role.code === 'admin') {
      if (role.code === 'admin' || role.code === 'owner') {
        throw new HttpException(
          'Admin cannot create owner or another admin',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    // Credential validation
    if (role.code === 'cashier') {
      if (!createUserDto.pin) {
        throw new HttpException(
          'PIN is required for cashier',
          HttpStatus.BAD_REQUEST,
        );
      }
    } else {
      if (!createUserDto.username) {
        throw new HttpException(
          'Username is required for this role',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // hash password
    let hashedPassword = null;
    if (createUserDto.password) {
      hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    }

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      is_verified: true,
      verify_code: null,
      exp_verify_at: null,
      role,
    });
    await this.userRepository.save(user);

    // assign branch if provided
    if (createUserDto.branch_id) {
      const userBranch = this.userBranchRepository.create({
        userId: user.id,
        branchId: createUserDto.branch_id,
      });
      await this.userBranchRepository.save(userBranch);
    }

    return {
      message: successUserMessage.USER_CREATED,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.code,
        is_verified: user.is_verified,
      },
    };
  }

  // find user by email
  async findEmail(email: string): Promise<any> {
    return await this.userRepository.findOne({
      where: { email },
      relations: ['role'],
    });
  }

  // find user by id
  async findOne(id: string): Promise<AuthResponse> {
    const user = await this.userRepository.findOne({
      where: { id },
      // NOTE: 'role' must be explicit — TypeORM ignores eager:true when relations[] is specified
      relations: ['role', 'userBranches', 'userBranches.branch', 'profile'],
    });
    if (!user) {
      throw new HttpException(
        errUserMessage.USER_NOT_FOUND,
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      message: successUserMessage.USER_FOUND,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username || null,
        pin: user.pin || null,
        role: user.role?.name,
        role_code: user.role?.code,
        is_verified: user.is_verified,
        branches: user.userBranches?.map((ub) => ({
          id: ub.branch.id,
          name: ub.branch.name,
        })),
        profile: user.profile
          ? ({
              id: user.profile.id,
              address: user.profile.address,
              phone: user.profile.phone,
            } as any)
          : null,
      },
    };
  }

  // find user by verify code
  async findVerifyCode(verifyCode: string): Promise<any> {
    return await this.userRepository.findOne({
      where: { verify_code: verifyCode },
    });
  }

  // find all users
  async findAll(): Promise<AuthResponse> {
    const users = await this.userRepository.find({
      relations: ['profile', 'role'], // Add profile relation
    });
    return {
      message: successUserMessage.USER_FOUND,
      datas: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        is_verified: user.is_verified,
        profile: user.profile
          ? {
              address: user.profile.address,
              phone: user.profile.phone,
            }
          : null,
      })),
    };
  }

  // update user
  async update(
    id: string,
    updateUserDto: Partial<User>,
  ): Promise<AuthResponse> {
    const user = await this.userRepository.findOne({
      where: { id },
    });
    if (!user) {
      throw new HttpException(
        errUserMessage.USER_NOT_FOUND,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    await this.userRepository.update(id, {
      ...updateUserDto,
      updatedAt: new Date(),
    });

    const updatedUser = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    return {
      message: successUserMessage.USER_UPDATED,
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role.name,
        is_verified: updatedUser.is_verified,
      },
    };
  }

  // remove user using soft delete
  async remove(id: string): Promise<AuthResponse> {
    const user = await this.userRepository.findOne({
      where: { id },
    });
    if (!user) {
      throw new HttpException(
        errUserMessage.USER_NOT_FOUND,
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.userRepository.softDelete(id);

    return {
      message: successUserMessage.USER_DELETED,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        is_verified: user.is_verified,
      },
    };
  }
}
