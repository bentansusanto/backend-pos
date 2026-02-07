import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { errUserMessage } from 'src/libs/errors/error_user';
import { successUserMessage } from 'src/libs/success/success_user';
import { AuthResponse } from 'src/types/response/auth.type';
import { Repository } from 'typeorm';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { Logger } from 'winston';

@Injectable()
export class UsersService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  // create user for super admin and owner
  async create(createUserDto: CreateUserDto): Promise<any> {
    try {
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
      });
      this.logger.debug(`Created user with verify_code: ${user.verify_code}`);
      const saveUser = await this.userRepository.save(user);
      const { password, ...result } = saveUser;
      return result;
    } catch (error) {
      this.logger.error(errUserMessage.USER_CREATE_FAILED, error);
      throw error;
    }
  }

  // create user for admin, staff, cashier
  async createUser(createUserDto: CreateUserDto): Promise<AuthResponse> {
    try {
      // check user already exists
      const userExists = await this.findEmail(createUserDto.email);
      if (userExists) {
        throw new HttpException(
          errUserMessage.USER_ALREADY_EXISTS,
          HttpStatus.BAD_REQUEST,
        );
      }

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
      });
      this.logger.debug(`Created user with verify_code: ${user.verify_code}`);
      const saveUser = await this.userRepository.save(user);
      this.logger.debug(`${successUserMessage.USER_CREATED}: ${saveUser.name}`);
      return {
        message: successUserMessage.USER_CREATED,
        data: {
          id: saveUser.id,
          name: saveUser.name,
          email: saveUser.email,
          is_verified: saveUser.is_verified,
        },
      };
    } catch (error) {
      this.logger.error(errUserMessage.USER_CREATE_FAILED, error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new HttpException(
        errUserMessage.USER_CREATE_FAILED,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // find user by email
  async findEmail(email: string): Promise<any> {
    try {
      const user = await this.userRepository.findOne({
        where: { email },
      });
      return user;
    } catch (error) {
      this.logger.error(errUserMessage.USER_NOT_FOUND, error);
      throw error;
    }
  }

  // find user by id
  async findOne(id: string): Promise<AuthResponse> {
    try {
      const user = await this.userRepository.findOne({
        where: { id },
      });
      if (!user) {
        throw new HttpException(
          errUserMessage.USER_NOT_FOUND,
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.debug(`Found user with id: ${user.id}`);

      return {
        message: successUserMessage.USER_FOUND,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          is_verified: user.is_verified,
        },
      };
    } catch (error) {
      this.logger.error(errUserMessage.USER_NOT_FOUND, error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new HttpException(
        errUserMessage.USER_NOT_FOUND,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // find user by verify code
  async findVerifyCode(verifyCode: string): Promise<any> {
    try {
      const user = await this.userRepository.findOne({
        where: { verify_code: verifyCode },
      });
      return user;
    } catch (error) {
      this.logger.error(errUserMessage.USER_NOT_FOUND, error);
      throw error;
    }
  }

  // find all users
  async findAll(): Promise<any> {
    try {
      const users = await this.userRepository.find();
      return users;
    } catch (error) {
      this.logger.error(errUserMessage.USER_NOT_FOUND, error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new HttpException(
        errUserMessage.USER_NOT_FOUND,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // update user
  async update(id: string, updateUserDto: UpdateUserDto): Promise<AuthResponse> {
    try {
      const user = await this.userRepository.findOne({
        where: { id },
      });
      if (!user) {
        this.logger.debug(`${errUserMessage.USER_NOT_FOUND}: ${id}`);
        throw new HttpException(
          errUserMessage.USER_NOT_FOUND,
          HttpStatus.BAD_REQUEST,
        );
      }

      const hashedPassword = await bcrypt.hash(updateUserDto.password, 10);

      await this.userRepository.update(id, {
        name: updateUserDto.name,
        email: updateUserDto.email,
        password: hashedPassword,
        updatedAt: new Date(),
      });
      this.logger.debug(`${successUserMessage.USER_UPDATED}: ${user.id}`);

      return {
        message: successUserMessage.USER_UPDATED,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          is_verified: user.is_verified,
        },
      };
    } catch (error) {
      this.logger.error(errUserMessage.USER_UPDATE_FAILED, error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new HttpException(
        errUserMessage.USER_UPDATE_FAILED,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // remove user using soft delete
  async remove(id: string): Promise<AuthResponse> {
    try {
      const user = await this.userRepository.findOne({
        where: { id },
      });
      if (!user) {
        this.logger.debug(`${errUserMessage.USER_NOT_FOUND}: ${id}`);
        throw new HttpException(
          errUserMessage.USER_NOT_FOUND,
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.userRepository.softDelete(id);
      this.logger.debug(`${successUserMessage.USER_DELETED}: ${user.id}`);

      return {
        message: successUserMessage.USER_DELETED,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          is_verified: user.is_verified,
        },
      };
    } catch (error) {
      this.logger.error(errUserMessage.USER_DELETE_FAILED, error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new HttpException(
        errUserMessage.USER_DELETE_FAILED,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
