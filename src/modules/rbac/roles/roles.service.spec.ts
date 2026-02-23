import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { errorRoleMessage } from 'src/libs/errors/error_role';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  let service: RolesService;
  let roleRepository: Repository<Role>;

  const mockRole = {
    id: 'role-id',
    name: 'Test Role',
    code: 'test_role',
    description: 'Test Description',
    self_registered: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    roleRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all roles', async () => {
      jest.spyOn(roleRepository, 'find').mockResolvedValue([mockRole as any]);

      const result = await service.findAll();

      expect(roleRepository.find).toHaveBeenCalled();
      expect(result.datas).toHaveLength(1);
      expect(result.datas[0].id).toEqual(mockRole.id);
    });

    it('should throw error if no roles found', async () => {
      jest.spyOn(roleRepository, 'find').mockResolvedValue([]);

      await expect(service.findAll()).rejects.toThrow(
        new HttpException(
          errorRoleMessage.ERROR_FIND_ALL_ROLE,
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('findOne', () => {
    it('should return a role by id', async () => {
      jest.spyOn(roleRepository, 'findOne').mockResolvedValue(mockRole as any);

      const result = await service.findOne('role-id');

      expect(roleRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'role-id' },
      });
      expect(result.data.id).toEqual(mockRole.id);
    });

    it('should throw error if role not found', async () => {
      jest.spyOn(roleRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        new HttpException(
          errorRoleMessage.ERROR_FIND_ROLE,
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });
});
