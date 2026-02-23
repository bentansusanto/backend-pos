import { Test, TestingModule } from '@nestjs/testing';
import { CreateProfileDto, UpdateProfileDto } from './dto/create-profile.dto';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

describe('ProfilesController', () => {
  let controller: ProfilesController;
  let service: ProfilesService;

  const mockUser = {
    id: 'user-id',
    name: 'Test User',
  };

  const mockProfile = {
    id: 'profile-id',
    user_id: 'user-id',
    address: 'Test Address',
    phone: '1234567890',
  };

  const mockProfileResponse = {
    message: 'Success',
    data: mockProfile,
  };

  const mockProfilesService = {
    create: jest.fn().mockResolvedValue(mockProfileResponse),
    findByUserId: jest.fn().mockResolvedValue(mockProfileResponse),
    update: jest.fn().mockResolvedValue(mockProfileResponse),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [
        {
          provide: ProfilesService,
          useValue: mockProfilesService,
        },
      ],
    }).compile();

    controller = module.get<ProfilesController>(ProfilesController);
    service = module.get<ProfilesService>(ProfilesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a profile', async () => {
      const createProfileDto: CreateProfileDto = {
        user_id: 'user-id',
        address: 'Test Address',
        phone: '1234567890',
      };

      const result = await controller.create(mockUser as any, createProfileDto);

      expect(service.create).toHaveBeenCalledWith(
        mockUser.id,
        createProfileDto,
      );
      expect(result).toEqual({
        message: mockProfileResponse.message,
        data: mockProfileResponse.data,
      });
    });
  });

  describe('findOne', () => {
    it('should return the current user profile', async () => {
      const result = await controller.findOne(mockUser as any);

      expect(service.findByUserId).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({
        message: mockProfileResponse.message,
        data: mockProfileResponse.data,
      });
    });
  });

  describe('findByUserId', () => {
    it('should return a profile by user id', async () => {
      const result = await controller.findByUserId('user-id');

      expect(service.findByUserId).toHaveBeenCalledWith('user-id');
      expect(result).toEqual({
        message: mockProfileResponse.message,
        data: mockProfileResponse.data,
      });
    });
  });

  describe('update', () => {
    it('should update a profile', async () => {
      const updateProfileDto: UpdateProfileDto = {
        address: 'Updated Address',
      };

      const result = await controller.update(
        mockUser as any,
        'profile-id',
        updateProfileDto,
      );

      expect(service.update).toHaveBeenCalledWith(
        mockUser.id,
        'profile-id',
        updateProfileDto,
      );
      expect(result).toEqual({
        message: mockProfileResponse.message,
        data: mockProfileResponse.data,
      });
    });
  });
});
