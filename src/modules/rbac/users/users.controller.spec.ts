import { Test, TestingModule } from '@nestjs/testing';
import { CreateUserByOwnerDto, UpdateUserDto } from './dto/create-user.dto';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUser = {
    id: 'user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: { name: 'Test Role' },
    is_verified: true,
  };

  const mockAuthResponse = {
    message: 'Success',
    data: mockUser,
  };

  const mockAuthResponseList = {
    message: 'Success',
    datas: [mockUser],
  };

  const mockUsersService = {
    createUser: jest.fn().mockResolvedValue(mockAuthResponse),
    findAll: jest.fn().mockResolvedValue(mockAuthResponseList),
    findOne: jest.fn().mockResolvedValue(mockAuthResponse),
    update: jest.fn().mockResolvedValue(mockAuthResponse),
    remove: jest.fn().mockResolvedValue(mockAuthResponse),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a user', async () => {
      const dto: CreateUserByOwnerDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password',
        role_id: 'role-id',
      };

      const result = await controller.create(dto, {} as any);

      expect(service.createUser).toHaveBeenCalledWith(dto);
      expect(result).toEqual({
        message: mockAuthResponse.message,
        data: mockAuthResponse.data,
      });
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual({
        message: mockAuthResponseList.message,
        data: mockAuthResponseList.datas,
      });
    });
  });

  describe('getUser', () => {
    it('should return the current user', async () => {
      const result = await controller.getUser(mockUser as any);

      expect(service.findOne).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({
        message: mockAuthResponse.message,
        data: mockAuthResponse.data,
      });
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const result = await controller.findOne('user-id');

      expect(service.findOne).toHaveBeenCalledWith('user-id');
      expect(result).toEqual({
        message: mockAuthResponse.message,
        data: mockAuthResponse.data,
      });
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const dto: UpdateUserDto = { name: 'Updated Name' };
      const result = await controller.update('user-id', dto);

      expect(service.update).toHaveBeenCalledWith('user-id', dto);
      expect(result).toEqual({
        message: mockAuthResponse.message,
        data: mockAuthResponse.data,
      });
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      const result = await controller.remove('user-id');

      expect(service.remove).toHaveBeenCalledWith('user-id');
      expect(result).toEqual({
        message: mockAuthResponse.message,
        data: mockAuthResponse.data,
      });
    });
  });
});
