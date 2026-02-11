import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ProfileResponse } from 'src/types/response/profile.type';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { UsersService } from '../users/users.service';
import { CreateProfileDto, UpdateProfileDto } from './dto/create-profile.dto';
import { Profile } from './entities/profile.entity';

@Injectable()
export class ProfilesService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    private readonly userService: UsersService,
  ) {}
  // create profile
  async create(
    userId: string,
    createProfileDto: CreateProfileDto,
  ): Promise<ProfileResponse> {
    try {
      // find user by id
      const findUser = await this.userService.findOne(userId);
      if (!findUser) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      // check if user already has a profile
      const findProfile = await this.profileRepository.findOne({
        where: { user: { id: findUser.data.id } },
      });
      if (findProfile) {
        this.logger.error('User already has a profile');
        throw new HttpException(
          'User already has a profile',
          HttpStatus.BAD_REQUEST,
        );
      }
      const profile = this.profileRepository.create({
        ...createProfileDto,
        user: {
          id: userId,
        },
      });
      await this.profileRepository.save(profile);
      return {
        message: 'Profile created successfully',
        data: {
          id: profile.id,
          user_id: profile.user.id,
          address: profile.address,
          phone: profile.phone,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error('Failed to create profile', error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to create profile',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(): Promise<ProfileResponse> {
    try {
      const profiles = await this.profileRepository.find({
        relations: ['user'],
      });
      if (!profiles || profiles.length === 0) {
        this.logger.error('Profiles not found');
        throw new HttpException('Profiles not found', HttpStatus.NOT_FOUND);
      }
      return {
        message: 'Profiles fetched successfully',
        datas: profiles.map((profile) => ({
          id: profile.id,
          user_id: profile.user.id,
          address: profile.address,
          phone: profile.phone,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        })),
      };
    } catch (error) {
      this.logger.error('Failed to fetch profiles', error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch profiles',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: string): Promise<ProfileResponse> {
    try {
      const profile = await this.profileRepository.findOne({
        where: { id },
        relations: ['user'],
      });
      if (!profile) {
        this.logger.error('Profile not found');
        throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
      }
      return {
        message: 'Profile fetched successfully',
        data: {
          id: profile.id,
          user_id: profile.user.id,
          address: profile.address,
          phone: profile.phone,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error('Failed to fetch profile', error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch profile',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    userId: string,
    id: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileResponse> {
    try {
      const profile = await this.profileRepository.findOne({
        where: { id },
        relations: ['user'],
      });
      if (!profile) {
        this.logger.error('Profile not found');
        throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
      }
      await this.profileRepository.update(id, {
        ...updateProfileDto,
        user: {
          id: userId,
        },
      });
      return {
        message: 'Profile updated successfully',
        data: {
          id: profile.id,
          user_id: profile.user.id,
          address: profile.address,
          phone: profile.phone,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error('Failed to update profile', error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to update profile',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string): Promise<ProfileResponse> {
    try {
      const profile = await this.profileRepository.findOne({
        where: { id },
        relations: ['user'],
      });
      if (!profile) {
        this.logger.error('Profile not found');
        throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
      }
      await this.profileRepository.remove(profile);
      return {
        message: 'Profile deleted successfully',
      };
    } catch (error) {
      this.logger.error('Failed to delete profile', error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to delete profile',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
