import { Test, TestingModule } from '@nestjs/testing';
import { BranchesService } from './branches.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Branch } from './entities/branch.entity';
import { UserBranch } from './entities/user-branch.entity';
import { UsersService } from '../rbac/users/users.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { HttpException, HttpStatus } from '@nestjs/common';
import { errBranchMessage } from 'src/libs/errors/error_branch';
import { successBranchMessage } from 'src/libs/success/success_branch';

describe('BranchesService', () => {
  let service: BranchesService;
  let branchRepository;
  let userBranchRepository;
  let usersService;
  let logger;

  const mockBranch = {
    id: 'branch-id',
    name: 'Test Branch',
    code: 'test-branch',
    address: 'Test Address',
    phone: '1234567890',
    email: 'test@example.com',
    city: 'Test City',
    province: 'Test Province',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBranchRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockUserBranchRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUsersService = {
    findOne: jest.fn(),
  };

  const mockLogger = {
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchesService,
        {
          provide: getRepositoryToken(Branch),
          useValue: mockBranchRepository,
        },
        {
          provide: getRepositoryToken(UserBranch),
          useValue: mockUserBranchRepository,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<BranchesService>(BranchesService);
    branchRepository = module.get(getRepositoryToken(Branch));
    userBranchRepository = module.get(getRepositoryToken(UserBranch));
    usersService = module.get(UsersService);
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createBranchDto = {
      name: 'Test Branch',
      address: 'Test Address',
      phone: '1234567890',
      email: 'test@example.com',
      city: 'Test City',
      province: 'Test Province',
    };

    it('should create a branch successfully', async () => {
      jest.spyOn(branchRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(branchRepository, 'create').mockReturnValue(mockBranch);
      jest.spyOn(branchRepository, 'save').mockResolvedValue(mockBranch);

      const result = await service.create(createBranchDto);

      expect(result.message).toEqual(successBranchMessage.BRANCH_CREATED);
      expect(result.data.id).toEqual(mockBranch.id);
      expect(branchRepository.create).toHaveBeenCalled();
    });

    it('should throw error if branch name already exists', async () => {
      jest.spyOn(branchRepository, 'findOne').mockResolvedValue(mockBranch);

      await expect(service.create(createBranchDto)).rejects.toThrow(
        new HttpException(
          errBranchMessage.BRANCH_CODE_ALREADY_EXISTS,
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('findAll', () => {
    it('should return all branches', async () => {
      jest.spyOn(branchRepository, 'find').mockResolvedValue([mockBranch]);

      const result = await service.findAll();

      expect(result.message).toEqual(successBranchMessage.BRANCH_FOUND_ALL);
      expect(result.datas.length).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a branch by id', async () => {
      jest.spyOn(branchRepository, 'findOne').mockResolvedValue(mockBranch);

      const result = await service.findOne('branch-id');

      expect(result.message).toEqual(successBranchMessage.BRANCH_FOUND);
      expect(result.data.id).toEqual(mockBranch.id);
    });

    it('should throw error if branch not found', async () => {
      jest.spyOn(branchRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        new HttpException(
          errBranchMessage.BRANCH_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('update', () => {
    const updateBranchDto = {
      name: 'Updated Branch',
    };

    it('should update a branch successfully', async () => {
      jest.spyOn(branchRepository, 'findOne').mockResolvedValue(mockBranch);
      jest.spyOn(branchRepository, 'update').mockResolvedValue({ affected: 1 });

      const result = await service.update('branch-id', updateBranchDto);

      expect(result.message).toEqual(successBranchMessage.BRANCH_UPDATED);
      expect(result.data.id).toEqual(mockBranch.id);
    });

    it('should throw error if branch not found for update', async () => {
      jest.spyOn(branchRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.update('invalid-id', updateBranchDto),
      ).rejects.toThrow(
        new HttpException(
          errBranchMessage.BRANCH_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('remove', () => {
    it('should remove a branch successfully', async () => {
      jest.spyOn(branchRepository, 'findOne').mockResolvedValue(mockBranch);
      jest.spyOn(branchRepository, 'delete').mockResolvedValue({ affected: 1 });

      const result = await service.remove('branch-id');

      expect(result.message).toEqual(successBranchMessage.BRANCH_DELETED);
    });

    it('should throw error if branch not found for deletion', async () => {
      jest.spyOn(branchRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(
        new HttpException(
          errBranchMessage.BRANCH_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });
});
