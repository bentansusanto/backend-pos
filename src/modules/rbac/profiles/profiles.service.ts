import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProfileResponse } from 'src/types/response/profile.type';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { CreateProfileDto, UpdateProfileDto } from './dto/create-profile.dto';
import { Profile } from './entities/profile.entity';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    private readonly userService: UsersService,
  ) {}
  // create profile
  async create(
    userId: string, // Keep this as fallback or enforce it via DTO?
    createProfileDto: CreateProfileDto,
  ): Promise<ProfileResponse> {
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
  }

  async findAll(): Promise<ProfileResponse> {
    const profiles = await this.profileRepository.find({
      relations: ['user'],
    });
    if (!profiles || profiles.length === 0) {
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
  }

  async findOne(id: string): Promise<ProfileResponse> {
    const profile = await this.profileRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!profile) {
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
  }

  async findByUserId(userId: string): Promise<ProfileResponse> {
    const profile = await this.profileRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (!profile) {
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
  }

  async update(
    userId: string,
    id: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileResponse> {
    const profile = await this.profileRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!profile) {
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
  }

  async remove(id: string): Promise<ProfileResponse> {
    const profile = await this.profileRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!profile) {
      throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
    }
    await this.profileRepository.remove(profile);
    return {
      message: 'Profile deleted successfully',
    };
  }
}
