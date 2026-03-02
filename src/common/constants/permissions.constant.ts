export enum Permission {
  // Dashboard
  DASHBOARD_VIEW = 'dashboard:view',
  DASHBOARD_ANALYTICS = 'dashboard:analytics',

  // Products
  PRODUCTS_CREATE = 'products:create',
  PRODUCTS_READ = 'products:read',
  PRODUCTS_UPDATE = 'products:update',
  PRODUCTS_DELETE = 'products:delete',
  PRODUCTS_IMPORT = 'products:import',
  PRODUCTS_EXPORT = 'products:export',

  // Product Variants
  VARIANTS_CREATE = 'variants:create',
  VARIANTS_READ = 'variants:read',
  VARIANTS_UPDATE = 'variants:update',
  VARIANTS_DELETE = 'variants:delete',

  // Product Stocks
  PRODUCT_STOCKS_CREATE = 'product_stocks:create',
  PRODUCT_STOCKS_READ = 'product_stocks:read',
  PRODUCT_STOCKS_UPDATE = 'product_stocks:update',
  PRODUCT_STOCKS_DELETE = 'product_stocks:delete',

  // Stock Movements
  STOCK_MOVEMENTS_CREATE = 'stock_movements:create',
  STOCK_MOVEMENTS_READ = 'stock_movements:read',
  STOCK_MOVEMENTS_UPDATE = 'stock_movements:update',
  STOCK_MOVEMENTS_DELETE = 'stock_movements:delete',

  // Categories
  CATEGORIES_CREATE = 'categories:create',
  CATEGORIES_READ = 'categories:read',
  CATEGORIES_UPDATE = 'categories:update',
  CATEGORIES_DELETE = 'categories:delete',

  // Orders (formerly Sales)
  ORDERS_CREATE = 'orders:create',
  ORDERS_READ = 'orders:read',
  ORDERS_UPDATE = 'orders:update',
  ORDERS_DELETE = 'orders:delete',

  // Payments
  PAYMENTS_CREATE = 'payments:create',
  PAYMENTS_READ = 'payments:read',
  PAYMENTS_UPDATE = 'payments:update',
  PAYMENTS_DELETE = 'payments:delete',
  PAYMENTS_VERIFY = 'payments:verifyPayment',

  // Customers
  CUSTOMERS_CREATE = 'customers:create',
  CUSTOMERS_READ = 'customers:read',
  CUSTOMERS_UPDATE = 'customers:update',
  CUSTOMERS_DELETE = 'customers:delete',

  // Branches
  BRANCHES_CREATE = 'branches:create',
  BRANCHES_READ = 'branches:read',
  BRANCHES_UPDATE = 'branches:update',
  BRANCHES_DELETE = 'branches:delete',

  // Users
  USERS_CREATE = 'users:create',
  USERS_READ = 'users:read',
  USERS_UPDATE = 'users:update',
  USERS_DELETE = 'users:delete',
  USERS_ASSIGN_ROLES = 'users:assign_roles',

  // Roles
  ROLES_CREATE = 'roles:create',
  ROLES_READ = 'roles:read',
  ROLES_UPDATE = 'roles:update',
  ROLES_DELETE = 'roles:delete',
  ROLES_ASSIGN_PERMISSIONS = 'roles:assign_permissions',

  // Permissions
  PERMISSIONS_CREATE = 'permissions:create',
  PERMISSIONS_READ = 'permissions:read',
  PERMISSIONS_UPDATE = 'permissions:update',
  PERMISSIONS_DELETE = 'permissions:delete',

  // Role Permissions
  ROLE_PERMISSIONS_ASSIGN = 'role_permissions:assign_permissions',

  // Profiles
  PROFILES_CREATE = 'profiles:create',
  PROFILES_READ = 'profiles:read',
  PROFILES_UPDATE = 'profiles:update',

  // AI Insight
  AI_INSIGHT_GENERATE = 'ai_insight:generate',
  AI_INSIGHT_READ = 'ai_insight:read',

  // Reports
  REPORTS_SALES = 'reports:sales',
  REPORTS_INVENTORY = 'reports:inventory',
  REPORTS_FINANCIAL = 'reports:financial',
  REPORTS_EXPORT = 'reports:export',

  // Settings
  SETTINGS_READ = 'settings:read',
  SETTINGS_UPDATE = 'settings:update',
}
