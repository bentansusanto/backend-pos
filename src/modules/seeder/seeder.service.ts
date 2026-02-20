import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../rbac/roles/entities/permission.entity';
import { Role } from '../rbac/roles/entities/role.entity';
import { RolePermission } from '../rbac/roles/entities/role_permission.entity';

@Injectable()
export class SeederService implements OnModuleInit {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  async seed() {
    console.log('🌱 Starting database seeding...');

    await this.seedPermissions();
    await this.seedRoles();
    await this.seedRolePermissions();

    console.log('✅ Database seeding completed!');
  }

  private async seedPermissions() {
    console.log('📝 Seeding permissions...');

    const permissions = [
      // Dashboard
      { action: 'dashboard:view', description: 'View dashboard' },
      {
        action: 'dashboard:analytics',
        description: 'View analytics',
      },

      // Products
      { action: 'products:create', description: 'Create products' },
      { action: 'products:read', description: 'View products' },
      { action: 'products:update', description: 'Update products' },
      { action: 'products:delete', description: 'Delete products' },
      { action: 'products:import', description: 'Import products' },
      { action: 'products:export', description: 'Export products' },

      // Sales
      {
        action: 'sales:create',
        description: 'Create sales transactions',
      },
      {
        action: 'sales:read',
        description: 'View sales transactions',
      },
      {
        action: 'sales:update',
        description: 'Update sales transactions',
      },
      {
        action: 'sales:delete',
        description: 'Delete sales transactions',
      },
      {
        action: 'sales:void',
        description: 'Void sales transactions',
      },
      { action: 'sales:refund', description: 'Process refunds' },

      // Inventory
      {
        action: 'inventory:create',
        description: 'Create inventory records',
      },
      { action: 'inventory:read', description: 'View inventory' },
      {
        action: 'inventory:update',
        description: 'Update inventory',
      },
      {
        action: 'inventory:delete',
        description: 'Delete inventory records',
      },
      {
        action: 'inventory:adjust',
        description: 'Adjust inventory levels',
      },
      {
        action: 'inventory:transfer',
        description: 'Transfer inventory between branches',
      },

      // Users
      { action: 'users:create', description: 'Create users' },
      { action: 'users:read', description: 'View users' },
      { action: 'users:update', description: 'Update users' },
      { action: 'users:delete', description: 'Delete users' },
      {
        action: 'users:assign_roles',
        description: 'Assign roles to users',
      },

      // Roles & Permissions
      { action: 'roles:create', description: 'Create roles' },
      { action: 'roles:read', description: 'View roles' },
      { action: 'roles:update', description: 'Update roles' },
      { action: 'roles:delete', description: 'Delete roles' },
      {
        action: 'roles:assign_permissions',
        description: 'Assign permissions to roles',
      },

      // Branches
      { action: 'branches:create', description: 'Create branches' },
      { action: 'branches:read', description: 'View branches' },
      { action: 'branches:update', description: 'Update branches' },
      { action: 'branches:delete', description: 'Delete branches' },

      // Reports
      { action: 'reports:sales', description: 'View sales reports' },
      {
        action: 'reports:inventory',
        description: 'View inventory reports',
      },
      {
        action: 'reports:financial',
        description: 'View financial reports',
      },
      { action: 'reports:export', description: 'Export reports' },

      // Settings
      { action: 'settings:read', description: 'View settings' },
      { action: 'settings:update', description: 'Update settings' },
    ];

    for (const perm of permissions) {
      const exists = await this.permissionRepository.findOne({
        where: { action: perm.action },
      });

      if (!exists) {
        const permission = this.permissionRepository.create({
          ...perm,
        });
        await this.permissionRepository.save(permission);
        console.log(`  ✓ Created permission: ${perm.action}`);
      }
    }

    console.log('✅ Permissions seeded');
  }

  private async seedRoles() {
    console.log('👥 Seeding roles...');

    const roles = [
      {
        name: 'owner',
        code: 'owner',
        self_registered: true,
        description: 'Owner with full system access',
      },
      {
        name: 'developer',
        code: 'developer',
        self_registered: false,
        description: 'Developer with full system access',
      },
      {
        name: 'admin',
        code: 'admin',
        self_registered: false,
        description: 'Admin with full system access',
      },
      {
        name: 'cashier',
        code: 'cashier',
        self_registered: false,
        description: 'Cashier with sales and basic inventory access',
      },
      {
        name: 'inventory_staff',
        code: 'inventory_staff',
        self_registered: false,
        description: 'Inventory Staff with inventory management access',
      },
      {
        name: 'accountant',
        code: 'accountant',
        self_registered: false,
        description: 'Accountant with financial reports access',
      },
    ];

    for (const role of roles) {
      const exists = await this.roleRepository.findOne({
        where: { name: role.name },
      });

      if (!exists) {
        const newRole = this.roleRepository.create({
          ...role,
        });
        await this.roleRepository.save(newRole);
        console.log(`  ✓ Created role: ${role.name}`);
      }
    }

    console.log('✅ Roles seeded');
  }

  private async seedRolePermissions() {
    console.log('🔗 Seeding role-permission mappings...');

    // Get all roles and permissions
    const owner = await this.roleRepository.findOne({
      where: { name: 'owner' },
    });
    const superAdmin = await this.roleRepository.findOne({
      where: { name: 'super_admin' },
    });
    const branchManager = await this.roleRepository.findOne({
      where: { name: 'branch_manager' },
    });
    const cashier = await this.roleRepository.findOne({
      where: { name: 'cashier' },
    });
    const inventoryStaff = await this.roleRepository.findOne({
      where: { name: 'inventory_staff' },
    });
    const accountant = await this.roleRepository.findOne({
      where: { name: 'accountant' },
    });

    const allPermissions = await this.permissionRepository.find();

    // Owner - All permissions
    if (owner) {
      for (const permission of allPermissions) {
        await this.assignPermissionToRole(owner.id, permission.id);
      }
      console.log(`  ✓ Assigned all permissions to owner`);
    }

    // Super Admin - All permissions
    if (superAdmin) {
      for (const permission of allPermissions) {
        await this.assignPermissionToRole(superAdmin.id, permission.id);
      }
      console.log(`  ✓ Assigned all permissions to super_admin`);
    }

    // Branch Manager - All except system settings
    if (branchManager) {
      const managerPermissions = allPermissions.filter(
        (p) =>
          !(p.action.startsWith('settings:') && p.action.endsWith('update')) &&
          !p.action.startsWith('branches:'), // Cannot manage branches
      );
      for (const permission of managerPermissions) {
        await this.assignPermissionToRole(branchManager.id, permission.id);
      }
      console.log(`  ✓ Assigned permissions to branch_manager`);
    }

    // Cashier - Sales and basic operations
    if (cashier) {
      const cashierPermissions = allPermissions.filter(
        (p) =>
          p.action === 'dashboard:view' ||
          (p.action.startsWith('products:') && p.action.includes('read')) ||
          (p.action.startsWith('sales:') &&
            ['create', 'read', 'refund'].some((a) => p.action.endsWith(a))) ||
          (p.action.startsWith('inventory:') && p.action.endsWith('read')),
      );
      for (const permission of cashierPermissions) {
        await this.assignPermissionToRole(cashier.id, permission.id);
      }
      console.log(`  ✓ Assigned permissions to cashier`);
    }

    // Inventory Staff - Inventory management
    if (inventoryStaff) {
      const inventoryPermissions = allPermissions.filter(
        (p) =>
          p.action === 'dashboard:view' ||
          (p.action.startsWith('products:') &&
            ['create', 'read', 'update'].some((a) => p.action.endsWith(a))) ||
          p.action.startsWith('inventory:') ||
          p.action === 'reports:inventory',
      );
      for (const permission of inventoryPermissions) {
        await this.assignPermissionToRole(inventoryStaff.id, permission.id);
      }
      console.log(`  ✓ Assigned permissions to inventory_staff`);
    }

    // Accountant - Reports and analytics
    if (accountant) {
      const accountantPermissions = allPermissions.filter(
        (p) =>
          p.action.startsWith('dashboard:') ||
          (p.action.startsWith('sales:') && p.action.endsWith('read')) ||
          p.action.startsWith('reports:'),
      );
      for (const permission of accountantPermissions) {
        await this.assignPermissionToRole(accountant.id, permission.id);
      }
      console.log(`  ✓ Assigned permissions to accountant`);
    }

    console.log('✅ Role-permission mappings seeded');
  }

  private async assignPermissionToRole(roleId: string, permissionId: string) {
    const exists = await this.rolePermissionRepository.findOne({
      where: {
        role: { id: roleId },
        permission: { id: permissionId },
      },
    });

    if (!exists) {
      const role = await this.roleRepository.findOne({ where: { id: roleId } });
      const permission = await this.permissionRepository.findOne({
        where: { id: permissionId },
      });

      const rolePermission = this.rolePermissionRepository.create({
        role,
        permission,
      });
      await this.rolePermissionRepository.save(rolePermission);
    }
  }
}
