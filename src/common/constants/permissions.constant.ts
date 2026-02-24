export enum Permission {
  // Dashboard
  DASHBOARD_VIEW = 'dashboard:view',

  // Products
  PRODUCTS_CREATE = 'products:create',
  PRODUCTS_READ = 'products:read',
  PRODUCTS_UPDATE = 'products:update',
  PRODUCTS_DELETE = 'products:delete',

  // Product Variants
  VARIANTS_CREATE = 'variants:create',
  VARIANTS_READ = 'variants:read',
  VARIANTS_UPDATE = 'variants:update',
  VARIANTS_DELETE = 'variants:delete',

  // Product Stocks
  STOCK_CREATE = 'stock:create',
  // Standardizing these to match the pattern (although code uses snake_case currently, we should map them correctly)
  // Current code uses: read_product_stock, update_product_stock, delete_product_stock
  // We will keep them as is to avoid breaking existing DB permissions unless we migrate DB too.
  // Ideally these should be stock:read, stock:update, etc.
  STOCK_READ = 'read_product_stock',
  STOCK_UPDATE = 'update_product_stock',
  STOCK_DELETE = 'delete_product_stock',

  // Stock Movements (New)
  STOCK_MOVEMENTS_CREATE = 'stock_movements:create',
  STOCK_MOVEMENTS_READ = 'stock_movements:read',
  STOCK_MOVEMENTS_UPDATE = 'stock_movements:update',
  STOCK_MOVEMENTS_DELETE = 'stock_movements:delete',

  // Categories
  CATEGORIES_CREATE = 'categories:create',
  CATEGORIES_READ = 'categories:read', // Implied
  CATEGORIES_UPDATE = 'categories:update',
  CATEGORIES_DELETE = 'categories:delete',

  // Sales / Orders
  SALES_CREATE = 'sales:create',
  SALES_READ = 'sales:read',
  SALES_UPDATE = 'sales:update', // Implied
  SALES_REFUND = 'sales:refund',

  // Payments
  PAYMENTS_CREATE = 'payments:create',
  PAYMENTS_READ = 'payments:read',
  PAYMENTS_UPDATE = 'payments:update',

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

  // Roles
  ROLES_READ = 'roles:read',

  // Profiles
  PROFILES_CREATE = 'profiles:create',
  PROFILES_READ = 'profiles:read',
  PROFILES_UPDATE = 'profiles:update',

  // AI Insight
  AI_INSIGHT_GENERATE = 'ai_insight:generate',
  AI_INSIGHT_READ = 'ai_insight:read',
}
