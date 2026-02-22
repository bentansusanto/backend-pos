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
    userId: string, // Keep this as fallback or enforce it via DTO?
    createProfileDto: CreateProfileDto,
  ): Promise<ProfileResponse> {
    try {
      // Use userId from DTO if provided, otherwise use the passed userId (which might be admin's ID)
      // BUT WAIT, if admin calls this, userId passed is admin's ID.
      // DTO's user_id is the target user.
      const targetUserId = createProfileDto.user_id || userId;

      // find user by id
      const findUser = await this.userService.findOne(targetUserId);
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
          id: targetUserId,
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

  async findByUserId(userId: string): Promise<ProfileResponse> {
    try {
      const profile = await this.profileRepository.findOne({
        where: { user: { id: userId } },
        relations: ['user'],
      });
      if (!profile) {
        // Return null or throw 404?
        // For "Edit Profile" flow, it's better to return null (or check if exists) to decide Create vs Update.
        // But the current pattern throws 404.
        // I'll stick to 404 and handle it in frontend.
        // Wait, if I want to "Create if not exists", fetching should return null, not throw.
        // But let's stick to existing pattern for now.
        // Actually, if I throw 404, frontend can catch it.
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
      // Don't log "Profile not found" as error if it's just a check
      if (
        error instanceof HttpException &&
        error.getStatus() === HttpStatus.NOT_FOUND
      ) {
        throw error;
      }
      this.logger.error('Failed to fetch profile by user id', error.stack);
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

      const updatePayload: any = { ...updateProfileDto };
      if (updateProfileDto.user_id) {
        updatePayload.user = { id: updateProfileDto.user_id };
      }
      delete updatePayload.user_id;

      await this.profileRepository.update(id, updatePayload);

      const updatedProfile = await this.profileRepository.findOne({
        where: { id },
        relations: ['user'],
      });

      return {
        message: 'Profile updated successfully',
        data: {
          id: updatedProfile.id,
          user_id: updatedProfile.user.id,
          address: updatedProfile.address,
          phone: updatedProfile.phone,
          createdAt: updatedProfile.createdAt,
          updatedAt: updatedProfile.updatedAt,
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
