import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserBranch } from 'src/modules/branches/entities/user-branch.entity';
import { Repository } from 'typeorm';
import { Role } from '../roles/entities/role.entity';
import { RolesService } from '../roles/roles.service';
import { CreateUserByOwnerDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;
  let userBranchRepository: Repository<UserBranch>;

  const mockUser = {
    id: 'user-id',
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedpassword',
    role: {
      id: 'role-id',
      name: 'Test Role',
      code: 'test_role',
    },
    userBranches: [],
    profile: {
      address: 'Test Address',
      phone: '1234567890',
    },
    is_verified: true,
  };

  const mockRole = {
    id: 'role-id',
    name: 'Test Role',
    code: 'test_role',
  };

  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  };

  const mockRolesService = {
    // Add methods if needed by UsersService
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger,
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Role),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserBranch),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: RolesService,
          useValue: mockRolesService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    roleRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
    userBranchRepository = module.get<Repository<UserBranch>>(
      getRepositoryToken(UserBranch),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      const createUserDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password',
      };
      const hashedPassword = 'hashedpassword';
      jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPassword as never);
      jest.spyOn(userRepository, 'create').mockReturnValue(mockUser as any);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser as any);

      const result = await service.create(createUserDto, mockRole as any);

      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(userRepository.create).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
        }),
      );
    });
  });

  describe('createUser', () => {
    it('should create a user by owner successfully', async () => {
      const createUserDto: CreateUserByOwnerDto = {
        name: 'New User',
        email: 'new@example.com',
        password: 'password',
        role_id: 'role-id',
        branch_id: 'branch-id',
      };

      jest.spyOn(service, 'findEmail').mockResolvedValue(null);
      jest.spyOn(roleRepository, 'findOne').mockResolvedValue(mockRole as any);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedpassword' as never);
      jest
        .spyOn(userRepository, 'create')
        .mockReturnValue({ ...mockUser, id: 'new-user-id' } as any);
      jest.spyOn(userRepository, 'save').mockResolvedValue({
        ...mockUser,
        id: 'new-user-id',
      } as any);
      jest.spyOn(userBranchRepository, 'create').mockReturnValue({
        userId: 'new-user-id',
        branchId: 'branch-id',
      } as any);
      jest.spyOn(userBranchRepository, 'save').mockResolvedValue({} as any);

      const result = await service.createUser(createUserDto);

      expect(service.findEmail).toHaveBeenCalledWith(createUserDto.email);
      expect(roleRepository.findOne).toHaveBeenCalledWith({
        where: { id: createUserDto.role_id },
      });
      expect(userRepository.save).toHaveBeenCalled();
      expect(userBranchRepository.save).toHaveBeenCalled();
      expect(result.data.email).toEqual(mockUser.email);
    });

    it('should throw error if user already exists', async () => {
      const createUserDto: CreateUserByOwnerDto = {
        name: 'Existing User',
        email: 'existing@example.com',
        password: 'password',
        role_id: 'role-id',
      };

      jest.spyOn(service, 'findEmail').mockResolvedValue(mockUser);

      await expect(service.createUser(createUserDto)).rejects.toThrow(
        new HttpException('User already exists', HttpStatus.BAD_REQUEST),
      );
    });

    it('should throw error if role not found', async () => {
      const createUserDto: CreateUserByOwnerDto = {
        name: 'New User',
        email: 'new@example.com',
        password: 'password',
        role_id: 'invalid-role-id',
      };

      jest.spyOn(service, 'findEmail').mockResolvedValue(null);
      jest.spyOn(roleRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createUser(createUserDto)).rejects.toThrow(
        new HttpException('Error finding role', HttpStatus.BAD_REQUEST),
      );
    });
  });

  describe('findOne', () => {
    it('should return a user if found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);

      const result = await service.findOne('user-id');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        relations: ['userBranches', 'userBranches.branch', 'profile'],
      });
      expect(result.data.id).toEqual(mockUser.id);
    });

    it('should throw error if user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        new HttpException('User not found', HttpStatus.BAD_REQUEST),
      );
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      jest.spyOn(userRepository, 'find').mockResolvedValue([mockUser] as any);

      const result = await service.findAll();

      expect(userRepository.find).toHaveBeenCalled();
      expect(result.datas).toHaveLength(1);
      expect(result.datas[0].id).toEqual(mockUser.id);
    });
  });

  describe('update', () => {
    it('should update a user successfully', async () => {
      const updateUserDto = { name: 'Updated Name' };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(userRepository, 'update').mockResolvedValue({} as any);

      const result = await service.update('user-id', updateUserDto);

      expect(userRepository.update).toHaveBeenCalledWith(
        'user-id',
        expect.objectContaining({
          name: 'Updated Name',
        }),
      );
      expect(result.data.name).toEqual(mockUser.name);
    });

    it('should throw error if user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update('invalid-id', {})).rejects.toThrow(
        new HttpException('User not found', HttpStatus.BAD_REQUEST),
      );
    });
  });

  describe('remove', () => {
    it('should remove (soft delete) a user successfully', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(userRepository, 'softDelete').mockResolvedValue({} as any);

      const result = await service.remove('user-id');

      expect(userRepository.softDelete).toHaveBeenCalledWith('user-id');
      expect(result).toEqual({
        message: 'Success delete user',
        data: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role.name,
          is_verified: mockUser.is_verified,
        },
      });
    });

    it('should throw error if user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(
        new HttpException('User not found', HttpStatus.BAD_REQUEST),
      );
    });
  });
});
