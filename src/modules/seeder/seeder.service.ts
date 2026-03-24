import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../branches/entities/branch.entity';
import { Category } from '../products/entities/category.entities';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { PromotionBranch } from '../promotions/entities/promotion-branch.entity';
import { PromotionRule } from '../promotions/entities/promotion-rule.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import {
  PromotionActionType,
  PromotionConditionType,
  PromotionStatus,
} from '../promotions/enums/promotion.enum';
import { Permission } from '../rbac/permissions/entities/permission.entity';
import { RolePermission } from '../rbac/role-permissions/entities/role_permission.entity';
import { Role } from '../rbac/roles/entities/role.entity';

@Injectable()
export class SeederService implements OnModuleInit {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(Promotion)
    private promotionRepository: Repository<Promotion>,
    @InjectRepository(PromotionRule)
    private promotionRuleRepository: Repository<PromotionRule>,
    @InjectRepository(PromotionBranch)
    private promotionBranchRepository: Repository<PromotionBranch>,
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
    @InjectRepository(ProductVariant)
    private productVariantRepository: Repository<ProductVariant>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  async seed() {
    console.log('🌱 Starting database seeding...');

    await this.seedPermissions();
    await this.seedRoles();
    await this.seedRolePermissions();
    await this.seedPromotions();

    console.log('✅ Database seeding completed!');
  }

  private async seedPermissions() {
    console.log('📝 Seeding permissions...');

    const permissions = [
      // Dashboard
      {
        module: 'dashboard',
        action: 'dashboard:view',
        description: 'View dashboard',
      },
      {
        module: 'dashboard',
        action: 'dashboard:analytics',
        description: 'View analytics',
      },

      // Products
      {
        module: 'products',
        action: 'products:create',
        description: 'Create products',
      },
      {
        module: 'products',
        action: 'products:read',
        description: 'View products',
      },
      {
        module: 'products',
        action: 'products:update',
        description: 'Update products',
      },
      {
        module: 'products',
        action: 'products:delete',
        description: 'Delete products',
      },
      {
        module: 'products',
        action: 'products:import',
        description: 'Import products',
      },
      {
        module: 'products',
        action: 'products:export',
        description: 'Export products',
      },

      // Variants
      {
        module: 'variants',
        action: 'variants:create',
        description: 'Create product variants',
      },
      {
        module: 'variants',
        action: 'variants:read',
        description: 'View product variants',
      },
      {
        module: 'variants',
        action: 'variants:update',
        description: 'Update product variants',
      },
      {
        module: 'variants',
        action: 'variants:delete',
        description: 'Delete product variants',
      },

      // Categories
      {
        module: 'categories',
        action: 'categories:create',
        description: 'Create categories',
      },
      {
        module: 'categories',
        action: 'categories:read',
        description: 'View categories',
      },
      {
        module: 'categories',
        action: 'categories:update',
        description: 'Update categories',
      },
      {
        module: 'categories',
        action: 'categories:delete',
        description: 'Delete categories',
      },

      // Product Stocks
      {
        module: 'product_stocks',
        action: 'product_stocks:create',
        description: 'Create product stock',
      },
      {
        module: 'product_stocks',
        action: 'product_stocks:read',
        description: 'View product stock',
      },
      {
        module: 'product_stocks',
        action: 'product_stocks:update',
        description: 'Update product stock',
      },
      {
        module: 'product_stocks',
        action: 'product_stocks:delete',
        description: 'Delete product stock',
      },

      // Product Batches
      {
        module: 'product_batches',
        action: 'product_batches:create',
        description: 'Create product batches',
      },
      {
        module: 'product_batches',
        action: 'product_batches:read',
        description: 'View product batches',
      },
      {
        module: 'product_batches',
        action: 'product_batches:update',
        description: 'Update product batches',
      },
      {
        module: 'product_batches',
        action: 'product_batches:delete',
        description: 'Delete product batches',
      },
      // Stock Movements
      {
        module: 'stock_movements',
        action: 'stock_movements:create',
        description: 'Create stock movements',
      },
      {
        module: 'stock_movements',
        action: 'stock_movements:read',
        description: 'View stock movements',
      },
      {
        module: 'stock_movements',
        action: 'stock_movements:update',
        description: 'Update stock movements',
      },
      {
        module: 'stock_movements',
        action: 'stock_movements:delete',
        description: 'Delete stock movements',
      },

      // Orders (formerly Sales)
      {
        module: 'orders',
        action: 'orders:create',
        description: 'Create orders',
      },
      {
        module: 'orders',
        action: 'orders:read',
        description: 'View orders',
      },
      {
        module: 'orders',
        action: 'orders:update',
        description: 'Update orders',
      },
      {
        module: 'orders',
        action: 'orders:delete',
        description: 'Delete orders',
      },

      // Payments
      {
        module: 'payments',
        action: 'payments:create',
        description: 'Create payment methods',
      },
      {
        module: 'payments',
        action: 'payments:read',
        description: 'View payment methods',
      },
      {
        module: 'payments',
        action: 'payments:update',
        description: 'Update payment methods',
      },
      {
        module: 'payments',
        action: 'payments:delete',
        description: 'Delete payment methods',
      },
      {
        module: 'payments',
        action: 'payments:verifyPayment',
        description: 'Verify payment',
      },

      // Customers
      {
        module: 'customers',
        action: 'customers:create',
        description: 'Create customers',
      },
      {
        module: 'customers',
        action: 'customers:read',
        description: 'View customers',
      },
      {
        module: 'customers',
        action: 'customers:update',
        description: 'Update customers',
      },
      {
        module: 'customers',
        action: 'customers:delete',
        description: 'Delete customers',
      },

      // Users
      { module: 'users', action: 'users:create', description: 'Create users' },
      { module: 'users', action: 'users:read', description: 'View users' },
      { module: 'users', action: 'users:update', description: 'Update users' },
      { module: 'users', action: 'users:delete', description: 'Delete users' },
      {
        module: 'users',
        action: 'users:assign_roles',
        description: 'Assign roles to users',
      },

      // Profiles
      {
        module: 'profiles',
        action: 'profiles:create',
        description: 'Create user profiles',
      },
      {
        module: 'profiles',
        action: 'profiles:read',
        description: 'View user profiles',
      },
      {
        module: 'profiles',
        action: 'profiles:update',
        description: 'Update user profiles',
      },

      // Roles
      { module: 'roles', action: 'roles:create', description: 'Create roles' },
      { module: 'roles', action: 'roles:read', description: 'View roles' },
      { module: 'roles', action: 'roles:update', description: 'Update roles' },
      { module: 'roles', action: 'roles:delete', description: 'Delete roles' },

      // Permissions
      {
        module: 'permissions',
        action: 'permissions:create',
        description: 'Create permissions',
      },
      {
        module: 'permissions',
        action: 'permissions:read',
        description: 'View permissions',
      },
      {
        module: 'permissions',
        action: 'permissions:update',
        description: 'Update permissions',
      },
      {
        module: 'permissions',
        action: 'permissions:delete',
        description: 'Delete permissions',
      },

      // Role Permissions
      {
        module: 'role_permissions',
        action: 'role_permissions:assign_permissions',
        description: 'Assign permissions to roles',
      },

      // Branches
      {
        module: 'branches',
        action: 'branches:create',
        description: 'Create branches',
      },
      {
        module: 'branches',
        action: 'branches:read',
        description: 'View branches',
      },
      {
        module: 'branches',
        action: 'branches:update',
        description: 'Update branches',
      },
      {
        module: 'branches',
        action: 'branches:delete',
        description: 'Delete branches',
      },

      // Sales Reports
      {
        module: 'sales_reports',
        action: 'sales_reports:read',
        description: 'View sales reports',
      },
      {
        module: 'sales_reports',
        action: 'sales_reports:export',
        description: 'Export sales reports',
      },

      // AI Insight
      {
        module: 'ai_insight',
        action: 'ai_insight:generate',
        description: 'Generate AI Insight',
      },
      {
        module: 'ai_insight',
        action: 'ai_insight:read',
        description: 'View AI Insight',
      },

      // AI Jobs
      {
        module: 'ai_jobs',
        action: 'ai_jobs:create',
        description: 'Create AI jobs',
      },
      {
        module: 'ai_jobs',
        action: 'ai_jobs:read',
        description: 'View AI jobs',
      },
      {
        module: 'ai_jobs',
        action: 'ai_jobs:update',
        description: 'Update AI jobs',
      },
      {
        module: 'ai_jobs',
        action: 'ai_jobs:delete',
        description: 'Delete AI jobs',
      },

      // Settings
      {
        module: 'settings',
        action: 'settings:read',
        description: 'View settings',
      },
      {
        module: 'settings',
        action: 'settings:update',
        description: 'Update settings',
      },

      // Stock Takes
      {
        module: 'stock_takes',
        action: 'stock_takes:check_frozen',
        description: 'Check if branch inventory is frozen',
      },
      // Promotions
      {
        module: 'promotions',
        action: 'promotions:create',
        description: 'Create promotions',
      },
      {
        module: 'promotions',
        action: 'promotions:read',
        description: 'View promotions',
      },
      {
        module: 'promotions',
        action: 'promotions:update',
        description: 'Update promotions',
      },
      {
        module: 'promotions',
        action: 'promotions:delete',
        description: 'Delete promotions',
      },
      // Supplier
      {
        module: 'suppliers',
        action: 'suppliers:create',
        description: 'Create suppliers',
      },
      {
        module: 'suppliers',
        action: 'suppliers:read',
        description: 'View suppliers',
      },
      {
        module: 'suppliers',
        action: 'suppliers:update',
        description: 'Update suppliers',
      },
      {
        module: 'suppliers',
        action: 'suppliers:delete',
        description: 'Delete suppliers',
      },
      // Purchases
      {
        module: 'purchases',
        action: 'purchases:create',
        description: 'Create purchases',
      },
      {
        module: 'purchases',
        action: 'purchases:read',
        description: 'View purchases',
      },
      {
        module: 'purchases',
        action: 'purchases:update',
        description: 'Update purchases',
      },
      {
        module: 'purchases',
        action: 'purchases:delete',
        description: 'Delete purchases',
      },
      // Purchase Receivings
      {
        module: 'purchase_receivings',
        action: 'purchase_receivings:create',
        description: 'Create purchase receivings',
      },
      {
        module: 'purchase_receivings',
        action: 'purchase_receivings:read',
        description: 'View purchase receivings',
      },
      {
        module: 'purchase_receivings',
        action: 'purchase_receivings:update',
        description: 'Update purchase receivings',
      },
      {
        module: 'purchase_receivings',
        action: 'purchase_receivings:delete',
        description: 'Delete purchase receivings',
      },
      // Expenses
      {
        module: 'expenses',
        action: 'expenses:create',
        description: 'Create expenses',
      },
      {
        module: 'expenses',
        action: 'expenses:read',
        description: 'View expenses',
      },
      {
        module: 'expenses',
        action: 'expenses:update',
        description: 'Update expenses',
      },
      {
        module: 'expenses',
        action: 'expenses:delete',
        description: 'Delete expenses',
      },
      // Expense Categories
      {
        module: 'expense_categories',
        action: 'expense_categories:create',
        description: 'Create expense categories',
      },
      {
        module: 'expense_categories',
        action: 'expense_categories:read',
        description: 'View expense categories',
      },
      {
        module: 'expense_categories',
        action: 'expense_categories:update',
        description: 'Update expense categories',
      },
      {
        module: 'expense_categories',
        action: 'expense_categories:delete',
        description: 'Delete expense categories',
      },
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
      } else {
        // Update existing permission to ensure module and description are set
        exists.module = perm.module;
        exists.description = perm.description;
        await this.permissionRepository.save(exists);
        // console.log(`  ✓ Updated permission: ${perm.action}`);
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
        name: 'super_admin',
        code: 'super_admin',
        self_registered: false,
        description: 'Super Admin with full system access',
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
        name: 'branch_manager',
        code: 'branch_manager',
        self_registered: false,
        description: 'Branch Manager with branch management access',
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
    const admin = await this.roleRepository.findOne({
      where: { name: 'admin' },
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

    // Admin - All permissions
    if (admin) {
      for (const permission of allPermissions) {
        await this.assignPermissionToRole(admin.id, permission.id);
      }
      console.log(`  ✓ Assigned all permissions to admin`);
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
          (p.action.startsWith('variants:') && p.action.includes('read')) ||
          (p.action.startsWith('orders:') &&
            ['create', 'read', 'update'].some((a) => p.action.endsWith(a))) ||
          (p.action.startsWith('product_stocks:') &&
            p.action.endsWith('read')) ||
          (p.action.startsWith('customers:') &&
            ['create', 'read', 'update', 'delete'].some((a) =>
              p.action.endsWith(a),
            )) ||
          (p.action.startsWith('payments:') && ['create', 'read']) ||
          p.action === 'stock_takes:check_frozen' ||
          p.action === 'promotions:read',
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
          p.action.startsWith('product_stocks:') ||
          p.action.startsWith('stock_movements:') ||
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
          (p.action.startsWith('orders:') && p.action.endsWith('read')) ||
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

  private async seedPromotions() {
    console.log('📢 Seeding promotions...');

    const branches = await this.branchRepository.find();
    if (branches.length === 0) {
      console.log('⚠️ No branches found, skipping branch-specific promotions');
    }

    const variants = await this.productVariantRepository.find({ take: 5 });
    const categories = await this.categoryRepository.find({ take: 2 });

    const promotions = [
      {
        name: 'Grand Opening Flash Sale',
        description: 'Get 20% off on all items for our grand opening!',
        status: PromotionStatus.ACTIVE,
        priority: 10,
        isStackable: true,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        rules: [
          {
            conditionType: PromotionConditionType.ALWAYS_TRUE,
            conditionValue: {},
            actionType: PromotionActionType.PERCENT_DISCOUNT,
            actionValue: { percentage: 20 },
            // Applies to everything
          },
        ],
      },
      {
        name: 'Beverage Boom: 10% Off Categories',
        description: 'Get 10% off when you buy from specific categories!',
        status: PromotionStatus.ACTIVE,
        priority: 8,
        isStackable: true,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        rules: [
          {
            conditionType: PromotionConditionType.MIN_SPEND,
            conditionValue: { minSpend: 50 },
            actionType: PromotionActionType.PERCENT_DISCOUNT,
            actionValue: { percentage: 10 },
            conditionCategories: categories.slice(0, 1), // Only if spend $50 on Category 1
            actionCategories: categories.slice(0, 1),
          },
        ],
      },
      {
        name: 'Exclusive Variant Deal',
        description: 'Special 50% discount on targeted item!',
        status: PromotionStatus.ACTIVE,
        priority: 15, // Higher priority
        isStackable: true,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        rules: [
          {
            conditionType: PromotionConditionType.MIN_QTY,
            conditionValue: { minQty: 1 },
            actionType: PromotionActionType.PERCENT_DISCOUNT,
            actionValue: { percentage: 50 },
            conditionVariants: variants.slice(0, 1),
            actionVariants: variants.slice(0, 1),
          },
        ],
      },
    ];

    for (const promoData of promotions) {
      const exists = await this.promotionRepository.findOne({
        where: { name: promoData.name },
      });

      if (!exists) {
        const { rules, ...pData } = promoData;
        const promotion = this.promotionRepository.create(pData);
        const savedPromotion = await this.promotionRepository.save(promotion);

        // Seed rules
        for (const ruleData of rules) {
          const {
            conditionVariants,
            conditionCategories,
            actionVariants,
            actionCategories,
            ...ruleProps
          } = ruleData as any;

          const rule = this.promotionRuleRepository.create({
            ...ruleProps,
            promotion: savedPromotion,
            conditionVariants,
            conditionCategories,
            actionVariants,
            actionCategories,
          });
          await this.promotionRuleRepository.save(rule);
        }

        // Seed branches (associate with first branch if exists)
        if (branches.length > 0) {
          const promoBranchArr = this.promotionBranchRepository.create({
            promotion: savedPromotion,
            branch: branches[0],
            // Branch-specific exclusions could be added here
            variants: variants.slice(1, 2), // Example: Only apply this branch-specific rule to variant #2
          });
          await this.promotionBranchRepository.save(promoBranchArr);
        }

        console.log(`  ✓ Created promotion: ${promoData.name}`);
      }
    }

    console.log('✅ Promotions seeded');
  }
}
