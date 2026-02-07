import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Hashids from 'hashids';
import { Repository } from 'typeorm';
import { Permission } from '../rbac/roles/entities/permission.entity';
import { Role } from '../rbac/roles/entities/role.entity';
import { RolePermission } from '../rbac/roles/entities/role_permission.entity';

@Injectable()
export class SeederService {

  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>,
  ) {

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
      { module: 'dashboard', action: 'view', description: 'View dashboard' },
      {
        module: 'dashboard',
        action: 'analytics',
        description: 'View analytics',
      },

      // Products
      { module: 'products', action: 'create', description: 'Create products' },
      { module: 'products', action: 'read', description: 'View products' },
      { module: 'products', action: 'update', description: 'Update products' },
      { module: 'products', action: 'delete', description: 'Delete products' },
      { module: 'products', action: 'import', description: 'Import products' },
      { module: 'products', action: 'export', description: 'Export products' },

      // Sales
      {
        module: 'sales',
        action: 'create',
        description: 'Create sales transactions',
      },
      {
        module: 'sales',
        action: 'read',
        description: 'View sales transactions',
      },
      {
        module: 'sales',
        action: 'update',
        description: 'Update sales transactions',
      },
      {
        module: 'sales',
        action: 'delete',
        description: 'Delete sales transactions',
      },
      {
        module: 'sales',
        action: 'void',
        description: 'Void sales transactions',
      },
      { module: 'sales', action: 'refund', description: 'Process refunds' },

      // Inventory
      {
        module: 'inventory',
        action: 'create',
        description: 'Create inventory records',
      },
      { module: 'inventory', action: 'read', description: 'View inventory' },
      {
        module: 'inventory',
        action: 'update',
        description: 'Update inventory',
      },
      {
        module: 'inventory',
        action: 'delete',
        description: 'Delete inventory records',
      },
      {
        module: 'inventory',
        action: 'adjust',
        description: 'Adjust inventory levels',
      },
      {
        module: 'inventory',
        action: 'transfer',
        description: 'Transfer inventory between branches',
      },

      // Users
      { module: 'users', action: 'create', description: 'Create users' },
      { module: 'users', action: 'read', description: 'View users' },
      { module: 'users', action: 'update', description: 'Update users' },
      { module: 'users', action: 'delete', description: 'Delete users' },
      {
        module: 'users',
        action: 'assign_roles',
        description: 'Assign roles to users',
      },

      // Roles & Permissions
      { module: 'roles', action: 'create', description: 'Create roles' },
      { module: 'roles', action: 'read', description: 'View roles' },
      { module: 'roles', action: 'update', description: 'Update roles' },
      { module: 'roles', action: 'delete', description: 'Delete roles' },
      {
        module: 'roles',
        action: 'assign_permissions',
        description: 'Assign permissions to roles',
      },

      // Branches
      { module: 'branches', action: 'create', description: 'Create branches' },
      { module: 'branches', action: 'read', description: 'View branches' },
      { module: 'branches', action: 'update', description: 'Update branches' },
      { module: 'branches', action: 'delete', description: 'Delete branches' },

      // Reports
      { module: 'reports', action: 'sales', description: 'View sales reports' },
      {
        module: 'reports',
        action: 'inventory',
        description: 'View inventory reports',
      },
      {
        module: 'reports',
        action: 'financial',
        description: 'View financial reports',
      },
      { module: 'reports', action: 'export', description: 'Export reports' },

      // Settings
      { module: 'settings', action: 'read', description: 'View settings' },
      { module: 'settings', action: 'update', description: 'Update settings' },
    ];

    for (const perm of permissions) {
      const exists = await this.permissionRepository.findOne({
        where: { module: perm.module, action: perm.action },
      });

      if (!exists) {
        const permission = this.permissionRepository.create({
          ...perm,
        });
        await this.permissionRepository.save(permission);
        console.log(`  ✓ Created permission: ${perm.module}:${perm.action}`);
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
          !(p.module === 'settings' && p.action === 'update') &&
          p.module !== 'branches', // Cannot manage branches
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
          (p.module === 'dashboard' && p.action === 'view') ||
          (p.module === 'products' && ['read'].includes(p.action)) ||
          (p.module === 'sales' &&
            ['create', 'read', 'refund'].includes(p.action)) ||
          (p.module === 'inventory' && p.action === 'read'),
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
          (p.module === 'dashboard' && p.action === 'view') ||
          (p.module === 'products' &&
            ['create', 'read', 'update'].includes(p.action)) ||
          p.module === 'inventory' ||
          (p.module === 'reports' && p.action === 'inventory'),
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
          p.module === 'dashboard' ||
          (p.module === 'sales' && p.action === 'read') ||
          p.module === 'reports',
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
