import { Test, TestingModule } from '@nestjs/testing';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
import { successBranchMessage } from 'src/libs/success/success_branch';

describe('BranchesController', () => {
  let controller: BranchesController;
  let service: BranchesService;

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

  const mockBranchesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    assignUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BranchesController],
      providers: [
        {
          provide: BranchesService,
          useValue: mockBranchesService,
        },
      ],
    }).compile();

    controller = module.get<BranchesController>(BranchesController);
    service = module.get<BranchesService>(BranchesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a branch', async () => {
      const createBranchDto = {
        name: 'Test Branch',
        address: 'Test Address',
        phone: '1234567890',
        email: 'test@example.com',
        city: 'Test City',
        province: 'Test Province',
      };

      jest.spyOn(service, 'create').mockResolvedValue({
        message: successBranchMessage.BRANCH_CREATED,
        data: mockBranch,
      });

      const result = await controller.create(createBranchDto);

      expect(result.message).toEqual(successBranchMessage.BRANCH_CREATED);
      expect(result.data).toEqual(mockBranch);
      expect(service.create).toHaveBeenCalledWith(createBranchDto);
    });
  });

  describe('findAll', () => {
    it('should return all branches', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue({
        message: successBranchMessage.BRANCH_FOUND_ALL,
        datas: [mockBranch],
      });

      const result = await controller.findAll();

      expect(result.message).toEqual(successBranchMessage.BRANCH_FOUND_ALL);
      expect(result.data).toEqual([mockBranch]);
    });
  });

  describe('findOne', () => {
    it('should return a branch by id', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        message: successBranchMessage.BRANCH_FOUND,
        data: mockBranch,
      });

      const result = await controller.findOne('branch-id');

      expect(result.message).toEqual(successBranchMessage.BRANCH_FOUND);
      expect(result.data).toEqual(mockBranch);
    });
  });

  describe('update', () => {
    it('should update a branch', async () => {
      const updateBranchDto = { name: 'Updated Branch' };

      jest.spyOn(service, 'update').mockResolvedValue({
        message: successBranchMessage.BRANCH_UPDATED,
        data: mockBranch,
      });

      const result = await controller.update('branch-id', updateBranchDto);

      expect(result.message).toEqual(successBranchMessage.BRANCH_UPDATED);
      expect(result.data).toEqual(mockBranch);
      expect(service.update).toHaveBeenCalledWith('branch-id', updateBranchDto);
    });
  });

  describe('remove', () => {
    it('should remove a branch', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue({
        message: successBranchMessage.BRANCH_DELETED,
      });

      const result = await controller.remove('branch-id');

      expect(result.message).toEqual(successBranchMessage.BRANCH_DELETED);
    });
  });

  describe('assignUser', () => {
    it('should assign a user to a branch', async () => {
      jest.spyOn(service, 'assignUser').mockResolvedValue({
        message: 'User assigned to branch successfully',
      });

      const result = await controller.assignUser('branch-id', 'user-id');

      expect(result.message).toEqual('User assigned to branch successfully');
      expect(service.assignUser).toHaveBeenCalledWith('branch-id', 'user-id');
    });
  });
});
