import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

describe('RolesController', () => {
  let controller: RolesController;
  let service: RolesService;

  const mockRole = {
    id: 'role-id',
    name: 'Test Role',
    code: 'test_role',
    description: 'Test Description',
  };

  const mockRoleResponse = {
    message: 'Success',
    data: mockRole,
  };

  const mockRoleResponseList = {
    message: 'Success',
    datas: [mockRole],
  };

  const mockRolesService = {
    create: jest.fn(),
    findAll: jest.fn().mockResolvedValue(mockRoleResponseList),
    findOne: jest.fn().mockResolvedValue(mockRoleResponse),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        {
          provide: RolesService,
          useValue: mockRolesService,
        },
      ],
    }).compile();

    controller = module.get<RolesController>(RolesController);
    service = module.get<RolesService>(RolesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all roles', async () => {
      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual({
        message: mockRoleResponseList.message,
        data: mockRoleResponseList.datas,
      });
    });
  });

  describe('findOne', () => {
    it('should return a role by id', async () => {
      const result = await controller.findOne('role-id');

      expect(service.findOne).toHaveBeenCalledWith('role-id');
      expect(result).toEqual({
        message: mockRoleResponse.message,
        data: mockRoleResponse.data,
      });
    });
  });
});
