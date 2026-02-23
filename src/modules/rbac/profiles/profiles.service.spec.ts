import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { CreateProfileDto, UpdateProfileDto } from './dto/create-profile.dto';
import { Profile } from './entities/profile.entity';
import { ProfilesService } from './profiles.service';

describe('ProfilesService', () => {
  let service: ProfilesService;
  let profileRepository: Repository<Profile>;
  let usersService: UsersService;

  const mockProfile = {
    id: 'profile-id',
    user: { id: 'user-id' },
    address: 'Test Address',
    phone: '1234567890',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'user-id',
    name: 'Test User',
  };

  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
  };

  const mockUsersService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesService,
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger,
        },
        {
          provide: getRepositoryToken(Profile),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
    profileRepository = module.get<Repository<Profile>>(
      getRepositoryToken(Profile),
    );
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a profile successfully', async () => {
      const createProfileDto: CreateProfileDto = {
        user_id: 'user-id',
        address: 'Test Address',
        phone: '1234567890',
      };
      jest
        .spyOn(usersService, 'findOne')
        .mockResolvedValue({ data: mockUser } as any);
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(profileRepository, 'create')
        .mockReturnValue(mockProfile as any);
      jest
        .spyOn(profileRepository, 'save')
        .mockResolvedValue(mockProfile as any);

      const result = await service.create('user-id', createProfileDto);

      expect(usersService.findOne).toHaveBeenCalledWith('user-id');
      expect(profileRepository.create).toHaveBeenCalled();
      expect(profileRepository.save).toHaveBeenCalled();
      expect(result.data.id).toEqual(mockProfile.id);
    });

    it('should throw error if user not found', async () => {
      const createProfileDto: CreateProfileDto = {
        user_id: 'user-id',
        address: 'Test Address',
        phone: '1234567890',
      };
      jest.spyOn(usersService, 'findOne').mockResolvedValue(null);

      await expect(service.create('user-id', createProfileDto)).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );
    });

    it('should throw error if user already has a profile', async () => {
      const createProfileDto: CreateProfileDto = {
        user_id: 'user-id',
        address: 'Test Address',
        phone: '1234567890',
      };
      jest
        .spyOn(usersService, 'findOne')
        .mockResolvedValue({ data: mockUser } as any);
      jest
        .spyOn(profileRepository, 'findOne')
        .mockResolvedValue(mockProfile as any);

      await expect(service.create('user-id', createProfileDto)).rejects.toThrow(
        new HttpException('User already has a profile', HttpStatus.BAD_REQUEST),
      );
    });
  });

  describe('findAll', () => {
    it('should return all profiles', async () => {
      jest
        .spyOn(profileRepository, 'find')
        .mockResolvedValue([mockProfile] as any);

      const result = await service.findAll();

      expect(profileRepository.find).toHaveBeenCalled();
      expect(result.datas).toHaveLength(1);
      expect(result.datas[0].id).toEqual(mockProfile.id);
    });

    it('should throw error if no profiles found', async () => {
      jest.spyOn(profileRepository, 'find').mockResolvedValue([]);

      await expect(service.findAll()).rejects.toThrow(
        new HttpException('Profiles not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('findOne', () => {
    it('should return a profile by id', async () => {
      jest
        .spyOn(profileRepository, 'findOne')
        .mockResolvedValue(mockProfile as any);

      const result = await service.findOne('profile-id');

      expect(profileRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'profile-id' },
        relations: ['user'],
      });
      expect(result.data.id).toEqual(mockProfile.id);
    });

    it('should throw error if profile not found', async () => {
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        new HttpException('Profile not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('findByUserId', () => {
    it('should return a profile by user id', async () => {
      jest
        .spyOn(profileRepository, 'findOne')
        .mockResolvedValue(mockProfile as any);

      const result = await service.findByUserId('user-id');

      expect(profileRepository.findOne).toHaveBeenCalledWith({
        where: { user: { id: 'user-id' } },
        relations: ['user'],
      });
      expect(result.data.id).toEqual(mockProfile.id);
    });

    it('should throw error if profile not found', async () => {
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findByUserId('invalid-user-id')).rejects.toThrow(
        new HttpException('Profile not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('update', () => {
    it('should update a profile successfully', async () => {
      const updateProfileDto: UpdateProfileDto = {
        address: 'Updated Address',
      };
      jest
        .spyOn(profileRepository, 'findOne')
        .mockResolvedValue(mockProfile as any);
      jest.spyOn(profileRepository, 'update').mockResolvedValue({} as any);

      const result = await service.update(
        'user-id',
        'profile-id',
        updateProfileDto,
      );

      expect(profileRepository.update).toHaveBeenCalled();
      expect(result.message).toEqual('Profile updated successfully');
    });

    it('should throw error if profile not found', async () => {
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update('user-id', 'invalid-id', {})).rejects.toThrow(
        new HttpException('Profile not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('remove', () => {
    it('should remove a profile successfully', async () => {
      jest
        .spyOn(profileRepository, 'findOne')
        .mockResolvedValue(mockProfile as any);
      jest.spyOn(profileRepository, 'remove').mockResolvedValue({} as any);

      const result = await service.remove('profile-id');

      expect(profileRepository.remove).toHaveBeenCalledWith(mockProfile);
      expect(result.message).toEqual('Profile deleted successfully');
    });

    it('should throw error if profile not found', async () => {
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(
        new HttpException('Profile not found', HttpStatus.NOT_FOUND),
      );
    });
  });
});
