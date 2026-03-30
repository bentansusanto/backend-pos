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
import { ReasonCategory, ReasonCategoryType } from '../reason-categories/entities/reason-category.entity';

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
    @InjectRepository(ReasonCategory)
    private reasonCategoryRepository: Repository<ReasonCategory>,
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
    await this.seedReasonCategories();

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
      {
        module: 'product_batches',
        action: 'product_batches:dispose',
        description: 'Dispose product batches',
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
      {
        module: 'orders',
        action: 'orders:refundOrder',
        description: 'Refund order',
      },
      {
        module: 'orders',
        action: 'orders:updateQuantity',
        description: 'Update order item quantity',
      },
      {
        module: 'orders',
        action: 'orders:deleteOrderItems',
        description: 'Delete order items',
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

      // Reason Categories
      {
        module: 'reason_categories',
        action: 'reason_categories:create',
        description: 'Create reason categories',
      },
      {
        module: 'reason_categories',
        action: 'reason_categories:read',
        description: 'View reason categories',
      },
      {
        module: 'reason_categories',
        action: 'reason_categories:update',
        description: 'Update reason categories',
      },
      {
        module: 'reason_categories',
        action: 'reason_categories:delete',
        description: 'Delete reason categories',
      },
      {
        module: 'sales_reports',
        action: 'sales_reports:export',
        description: 'Export sales reports',
      },
      {
        module: 'sales_reports',
        action: 'sales_reports:exportExcel',
        description: 'Export sales reports to excel',
      },
      {
        module: 'sales_reports',
        action: 'sales_reports:exportPdf',
        description: 'Export sales reports to pdf',
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
      // Taxes
      {
        module: 'tax',
        action: 'tax:create',
        description: 'Create taxes',
      },
      {
        module: 'tax',
        action: 'tax:read',
        description: 'View taxes',
      },
      {
        module: 'tax',
        action: 'tax:update',
        description: 'Update taxes',
      },
      {
        module: 'tax',
        action: 'tax:delete',
        description: 'Delete taxes',
      },
      // Reason categories
      {
        module: 'reason_categories',
        action: 'reason_categories:create',
        description: 'Create reason categories',
      },
      {
        module: 'reason_categories',
        action: 'reason_categories:read',
        description: 'View reason categories',
      },
      {
        module: 'reason_categories',
        action: 'reason_categories:update',
        description: 'Update reason categories',
      },
      {
        module: 'reason_categories',
        action: 'reason_categories:delete',
        description: 'Delete reason categories',
      },
      // User Logs
      {
        module: 'user_logs',
        action: 'user_logs:read',
        description: 'View activity logs',
      },
      // Stock Takes (General)
      {
        module: 'stock_takes',
        action: 'stock_takes:read',
        description: 'View stock take history',
      },
      // UI View Permissions (Specially for Sidebar filtering)
      {
        module: 'ui',
        action: 'inventory:view',
        description: 'Access inventory management menu',
      },
      {
        module: 'ui',
        action: 'marketing:view',
        description: 'Access marketing and promotion menu',
      },
      {
        module: 'ui',
        action: 'finance:view',
        description: 'Access finance and expenses menu',
      },
      {
        module: 'ui',
        action: 'purchasing:view',
        description: 'Access purchasing and receiving menu',
      },
      {
        module: 'ui',
        action: 'reports:view',
        description: 'Access reports and analytics menu',
      },
      {
        module: 'ui',
        action: 'pos_log:view',
        description: 'Access POS activity logs menu',
      },
      {
        module: 'ui',
        action: 'system:view',
        description: 'Access system settings and user management menu',
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
    const admin = await this.roleRepository.findOne({
      where: { name: 'admin' },
    });
    const cashier = await this.roleRepository.findOne({
      where: { name: 'cashier' },
    });

    const allPermissions = await this.permissionRepository.find();

    // Owner - All permissions
    if (owner) {
      for (const permission of allPermissions) {
        await this.assignPermissionToRole(owner.id, permission.id);
      }
      console.log(`  ✓ Assigned all permissions to owner`);
    }

    // Admin - Restricted orders access (Read-only for orders)
    if (admin) {
      const adminPermissions = allPermissions.filter(
        (p) => !p.action.startsWith('orders:') || p.action === 'orders:read',
      );
      for (const permission of adminPermissions) {
        await this.assignPermissionToRole(admin.id, permission.id);
      }
      console.log(`  ✓ Assigned restricted permissions to admin`);
    }



    // Cashier - Sales and basic operations (Restricted Sidebar)
    if (cashier) {
      const cashierPermissions = allPermissions.filter(
        (p) =>
          // p.action === 'dashboard:view' ||  <-- Removed as requested
          (p.action.startsWith('products:') && p.action.includes('read')) ||
          (p.action.startsWith('variants:') && p.action.includes('read')) ||
          (p.action.startsWith('orders:') &&
            ['create', 'read', 'update', 'delete', 'refundOrder', 'updateQuantity', 'deleteOrderItems'].some((a) => p.action.endsWith(a))) ||
          (p.action.startsWith('product_stocks:') &&
            p.action.endsWith('read')) ||
          (p.action.startsWith('customers:') &&
            ['create', 'read', 'update', 'delete'].some((a) =>
              p.action.endsWith(a),
            )) ||
          (p.action.startsWith('payments:') && ['create', 'read', 'verifyPayment', 'refund'].some((a) => p.action.endsWith(a))) ||
          (p.action.startsWith('pos_sessions:') && ['read', 'openSession', 'closeSession'].some((a) => p.action.endsWith(a))) ||
          p.action === 'branches:read' ||
          p.action === 'categories:read' ||
          p.action === 'taxes:read' ||
          p.action === 'users:read' ||
          p.action === 'stock_takes:check_frozen' ||
          p.action === 'promotions:read' ||
          p.action === 'sales_reports:read' ||
          p.action === 'reason_categories:read'
      );
      const cashierPermissionIds = cashierPermissions.map((p) => p.id);
      await this.syncRolePermissions(cashier.id, cashierPermissionIds);
      console.log(`  ✓ Synced permissions for cashier`);
    }



    console.log('✅ Role-permission mappings seeded');
  }

  private async syncRolePermissions(roleId: string, permissionIds: string[]) {
    // Delete all existing permissions for this role that are not in the new list
    // Actually, for simplicity and ensuring strictness, we'll clear and re-add
    // but a more performant way is to delete only what's not in the list.

    // Get current assignments
    const currentAssignments = await this.rolePermissionRepository.find({
      where: { role: { id: roleId } },
      relations: ['permission'],
    });

    const currentPtrs = currentAssignments.map((a) => a.permission.id);
    const toDelete = currentAssignments.filter((a) => !permissionIds.includes(a.permission.id));
    const toAdd = permissionIds.filter((id) => !currentPtrs.includes(id));

    if (toDelete.length > 0) {
      await this.rolePermissionRepository.remove(toDelete);
      console.log(`  - Removed ${toDelete.length} permissions from role ${roleId}`);
    }

    for (const permissionId of toAdd) {
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

    if (toAdd.length > 0) {
      console.log(`  + Added ${toAdd.length} permissions to role ${roleId}`);
    }
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

  private async seedReasonCategories() {
    console.log('📝 Seeding reason categories...');

    const categories = [
      // Refund Categories
      {
        type: ReasonCategoryType.REFUND,
        label: 'Damaged Product',
        value: 'DAMAGED_PRODUCT',
        min_description_length: 10,
        is_anomaly_trigger: false,
      },
      {
        type: ReasonCategoryType.REFUND,
        label: 'Customer Change Mind',
        value: 'CUSTOMER_CHANGE_MIND',
        min_description_length: 0,
        is_anomaly_trigger: false,
      },
      {
        type: ReasonCategoryType.REFUND,
        label: 'Wrong Item Sent',
        value: 'WRONG_ITEM',
        min_description_length: 5,
        is_anomaly_trigger: false,
      },
      {
        type: ReasonCategoryType.REFUND,
        label: 'Expired Product',
        value: 'EXPIRED',
        min_description_length: 10,
        is_anomaly_trigger: true,
      },
      {
        type: ReasonCategoryType.REFUND,
        label: 'Price Error',
        value: 'PRICE_ERR',
        min_description_length: 10,
        is_anomaly_trigger: false,
      },

      // Pos Session Categories
      {
        type: ReasonCategoryType.POS_SESSION,
        label: 'Matched',
        value: 'MATCHED',
        min_description_length: 0,
        is_anomaly_trigger: false,
      },
      {
        type: ReasonCategoryType.POS_SESSION,
        label: 'Wrong Change Given',
        value: 'WRONG_CHANGE',
        min_description_length: 10,
        is_anomaly_trigger: false,
      },
      {
        type: ReasonCategoryType.POS_SESSION,
        label: 'Cash Loss / Theft Suspicion',
        value: 'CASH_LOSS',
        min_description_length: 20,
        is_anomaly_trigger: true,
      },
      {
        type: ReasonCategoryType.POS_SESSION,
        label: 'Unrecorded Expense',
        value: 'UNRECORDED_EXPENSE',
        min_description_length: 15,
        is_anomaly_trigger: false,
      },
      {
        type: ReasonCategoryType.POS_SESSION,
        label: 'System / Technical Error',
        value: 'SYSTEM_ERROR',
        min_description_length: 15,
        is_anomaly_trigger: false,
      },
    ];

    for (const cat of categories) {
      const exists = await this.reasonCategoryRepository.findOne({
        where: { value: cat.value, type: cat.type },
      });

      if (!exists) {
        const category = this.reasonCategoryRepository.create(cat);
        await this.reasonCategoryRepository.save(category);
        console.log(`  ✓ Created reason category: ${cat.label} (${cat.type})`);
      }
    }

    console.log('✅ Reason categories seeded');
  }
}
