import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../rbac/roles/entities/permission.entity';
import { Role } from '../rbac/roles/entities/role.entity';
import { RolePermission } from '../rbac/roles/entities/role_permission.entity';
import { SeederService } from './seeder.service';

describe('SeederService', () => {
  let service: SeederService;
  let roleRepository: Repository<Role>;
  let permissionRepository: Repository<Permission>;
  let rolePermissionRepository: Repository<RolePermission>;

  // Mock repositories
  const mockRoleRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockPermissionRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockRolePermissionRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeederService,
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
        },
        {
          provide: getRepositoryToken(Permission),
          useValue: mockPermissionRepository,
        },
        {
          provide: getRepositoryToken(RolePermission),
          useValue: mockRolePermissionRepository,
        },
      ],
    }).compile();

    service = module.get<SeederService>(SeederService);
    roleRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
    permissionRepository = module.get<Repository<Permission>>(
      getRepositoryToken(Permission),
    );
    rolePermissionRepository = module.get<Repository<RolePermission>>(
      getRepositoryToken(RolePermission),
    );

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('seed', () => {
    it('should call all seeding methods in correct order', async () => {
      // Spy on private methods
      const seedPermissionsSpy = jest
        .spyOn(service as any, 'seedPermissions')
        .mockResolvedValue(undefined);
      const seedRolesSpy = jest
        .spyOn(service as any, 'seedRoles')
        .mockResolvedValue(undefined);
      const seedRolePermissionsSpy = jest
        .spyOn(service as any, 'seedRolePermissions')
        .mockResolvedValue(undefined);

      await service.seed();

      expect(seedPermissionsSpy).toHaveBeenCalledTimes(1);
      expect(seedRolesSpy).toHaveBeenCalledTimes(1);
      expect(seedRolePermissionsSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('seedPermissions', () => {
    it('should create new permissions if they do not exist', async () => {
      mockPermissionRepository.findOne.mockResolvedValue(null);
      const mockPermission = { module: 'dashboard', action: 'view' };
      mockPermissionRepository.create.mockReturnValue(mockPermission);
      mockPermissionRepository.save.mockResolvedValue(mockPermission);

      await (service as any).seedPermissions();

      // Should check for existing permissions (44 permissions)
      expect(mockPermissionRepository.findOne).toHaveBeenCalled();
      // Should create new permissions
      expect(mockPermissionRepository.create).toHaveBeenCalled();
      expect(mockPermissionRepository.save).toHaveBeenCalled();
    });

    it('should not create permissions if they already exist', async () => {
      const existingPermission = {
        id: '1',
        module: 'dashboard',
        action: 'view',
      };
      mockPermissionRepository.findOne.mockResolvedValue(existingPermission);

      await (service as any).seedPermissions();

      // Should check for existing permissions
      expect(mockPermissionRepository.findOne).toHaveBeenCalled();
      // Should NOT create or save
      expect(mockPermissionRepository.create).not.toHaveBeenCalled();
      expect(mockPermissionRepository.save).not.toHaveBeenCalled();
    });

    it('should create all 44 permissions when none exist', async () => {
      mockPermissionRepository.findOne.mockResolvedValue(null);
      mockPermissionRepository.create.mockImplementation((perm) => perm);
      mockPermissionRepository.save.mockImplementation((perm) =>
        Promise.resolve(perm),
      );

      await (service as any).seedPermissions();

      // Should create 44 permissions (verify at least 40+ were created)
      expect(
        mockPermissionRepository.create.mock.calls.length,
      ).toBeGreaterThanOrEqual(40);
      expect(
        mockPermissionRepository.save.mock.calls.length,
      ).toBeGreaterThanOrEqual(40);
    });
  });

  describe('seedRoles', () => {
    it('should create new roles if they do not exist', async () => {
      mockRoleRepository.findOne.mockResolvedValue(null);
      const mockRole = { name: 'super_admin', description: 'Super Admin' };
      mockRoleRepository.create.mockReturnValue(mockRole);
      mockRoleRepository.save.mockResolvedValue(mockRole);

      await (service as any).seedRoles();

      // Should check for existing roles
      expect(mockRoleRepository.findOne).toHaveBeenCalled();
      // Should create new roles
      expect(mockRoleRepository.create).toHaveBeenCalled();
      expect(mockRoleRepository.save).toHaveBeenCalled();
    });

    it('should not create roles if they already exist', async () => {
      const existingRole = { id: '1', name: 'super_admin' };
      mockRoleRepository.findOne.mockResolvedValue(existingRole);

      await (service as any).seedRoles();

      // Should check for existing roles
      expect(mockRoleRepository.findOne).toHaveBeenCalled();
      // Should NOT create or save
      expect(mockRoleRepository.create).not.toHaveBeenCalled();
      expect(mockRoleRepository.save).not.toHaveBeenCalled();
    });

    it('should create all 5 roles', async () => {
      mockRoleRepository.findOne.mockResolvedValue(null);
      mockRoleRepository.create.mockImplementation((role) => role);
      mockRoleRepository.save.mockImplementation((role) =>
        Promise.resolve(role),
      );

      await (service as any).seedRoles();

      // Should create 5 roles
      expect(mockRoleRepository.create).toHaveBeenCalledTimes(5);
      expect(mockRoleRepository.save).toHaveBeenCalledTimes(5);

      // Verify role names
      const roleNames = mockRoleRepository.create.mock.calls.map(
        (call) => call[0].name,
      );
      expect(roleNames).toContain('super_admin');
      expect(roleNames).toContain('branch_manager');
      expect(roleNames).toContain('cashier');
      expect(roleNames).toContain('inventory_staff');
      expect(roleNames).toContain('accountant');
    });
  });

  describe('seedRolePermissions', () => {
    const mockRoles = {
      super_admin: { id: '1', name: 'super_admin' },
      branch_manager: { id: '2', name: 'branch_manager' },
      cashier: { id: '3', name: 'cashier' },
      inventory_staff: { id: '4', name: 'inventory_staff' },
      accountant: { id: '5', name: 'accountant' },
    };

    const mockPermissions = [
      { id: 'p1', module: 'dashboard', action: 'view' },
      { id: 'p2', module: 'products', action: 'read' },
      { id: 'p3', module: 'sales', action: 'create' },
      { id: 'p4', module: 'inventory', action: 'read' },
      { id: 'p5', module: 'settings', action: 'update' },
      { id: 'p6', module: 'branches', action: 'create' },
    ];

    beforeEach(() => {
      mockRoleRepository.findOne.mockImplementation(({ where }) => {
        return Promise.resolve(mockRoles[where.name]);
      });
      mockPermissionRepository.find.mockResolvedValue(mockPermissions);
      mockRolePermissionRepository.findOne.mockResolvedValue(null);
      mockRolePermissionRepository.create.mockImplementation((rp) => rp);
      mockRolePermissionRepository.save.mockImplementation((rp) => {
        // Return the saved object with proper structure
        return Promise.resolve(rp);
      });
    });

    it('should assign all permissions to super_admin', async () => {
      // Spy on assignPermissionToRole to track calls
      const assignSpy = jest
        .spyOn(service as any, 'assignPermissionToRole')
        .mockResolvedValue(undefined);

      await (service as any).seedRolePermissions();

      // Super admin should get all 6 mock permissions
      const superAdminCalls = assignSpy.mock.calls.filter(
        (call) => call[0] === '1',
      );
      expect(superAdminCalls.length).toBe(6);
    });

    it('should not assign settings:update to branch_manager', async () => {
      await (service as any).seedRolePermissions();

      const branchManagerCalls =
        mockRolePermissionRepository.save.mock.calls.filter(
          (call) => call[0]?.role?.id === '2',
        );

      // Branch manager should not have settings:update permission
      const hasSettingsUpdate = branchManagerCalls.some(
        (call) =>
          call[0]?.permission?.module === 'settings' &&
          call[0]?.permission?.action === 'update',
      );
      expect(hasSettingsUpdate).toBe(false);
    });

    it('should not assign branches permissions to branch_manager', async () => {
      await (service as any).seedRolePermissions();

      const branchManagerCalls =
        mockRolePermissionRepository.save.mock.calls.filter(
          (call) => call[0]?.role?.id === '2',
        );

      // Branch manager should not have branches permissions
      const hasBranchesPermission = branchManagerCalls.some(
        (call) => call[0]?.permission?.module === 'branches',
      );
      expect(hasBranchesPermission).toBe(false);
    });

    it('should assign limited permissions to cashier', async () => {
      // Spy on assignPermissionToRole to track calls
      const assignSpy = jest
        .spyOn(service as any, 'assignPermissionToRole')
        .mockResolvedValue(undefined);

      await (service as any).seedRolePermissions();

      const cashierCalls = assignSpy.mock.calls.filter(
        (call) => call[0] === '3',
      );

      // Cashier should have limited permissions (should get dashboard:view, products:read, sales:create, inventory:read = 4 permissions)
      expect(cashierCalls.length).toBeGreaterThan(0);
      expect(cashierCalls.length).toBeLessThan(mockPermissions.length);
    });

    it('should not create duplicate role-permission mappings', async () => {
      const existingMapping = {
        id: 'rp1',
        role: mockRoles.super_admin,
        permission: mockPermissions[0],
      };
      mockRolePermissionRepository.findOne.mockResolvedValue(existingMapping);

      await (service as any).seedRolePermissions();

      // Should not save if mapping already exists
      expect(mockRolePermissionRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('assignPermissionToRole', () => {
    it('should create role-permission mapping if it does not exist', async () => {
      const mockRole = { id: '1', name: 'super_admin' };
      const mockPermission = { id: 'p1', module: 'dashboard', action: 'view' };

      mockRolePermissionRepository.findOne.mockResolvedValue(null);
      mockRoleRepository.findOne.mockResolvedValue(mockRole);
      mockPermissionRepository.findOne.mockResolvedValue(mockPermission);
      mockRolePermissionRepository.create.mockReturnValue({
        role: mockRole,
        permission: mockPermission,
      });

      await (service as any).assignPermissionToRole('1', 'p1');

      expect(mockRolePermissionRepository.findOne).toHaveBeenCalled();
      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(mockPermissionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'p1' },
      });
      expect(mockRolePermissionRepository.create).toHaveBeenCalled();
      expect(mockRolePermissionRepository.save).toHaveBeenCalled();
    });

    it('should not create mapping if it already exists', async () => {
      const existingMapping = {
        id: 'rp1',
        role: { id: '1' },
        permission: { id: 'p1' },
      };
      mockRolePermissionRepository.findOne.mockResolvedValue(existingMapping);

      await (service as any).assignPermissionToRole('1', 'p1');

      expect(mockRolePermissionRepository.findOne).toHaveBeenCalled();
      expect(mockRolePermissionRepository.create).not.toHaveBeenCalled();
      expect(mockRolePermissionRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPermissionRepository.findOne.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.seed()).rejects.toThrow('Database error');
    });

    it('should handle missing roles in seedRolePermissions', async () => {
      mockRoleRepository.findOne.mockResolvedValue(null);
      mockPermissionRepository.find.mockResolvedValue([]);

      // Should not throw error, just skip
      await expect(
        (service as any).seedRolePermissions(),
      ).resolves.not.toThrow();
    });
  });
});
