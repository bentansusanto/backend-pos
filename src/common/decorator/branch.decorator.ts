import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to get the current branch object from request context
 * @example
 * @Get('dashboard')
 * getDashboard(@CurrentBranch() branch: Branch) {
 *   return this.service.getData(branch);
 * }
 */
export const CurrentBranch = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.branch;
  },
);

/**
 * Decorator to get the current branch ID from request context
 * @example
 * @Get('sales')
 * getSales(@CurrentBranchId() branchId: string) {
 *   return this.service.getSalesByBranch(branchId);
 * }
 */
export const CurrentBranchId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.branchId;
  },
);

/**
 * Decorator to get all accessible branches for the current user
 * @example
 * @Get('accessible-branches')
 * getAccessibleBranches(@AccessibleBranches() branches: any[]) {
 *   return branches;
 * }
 */
export const AccessibleBranches = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.accessibleBranches || [];
  },
);

/**
 * Decorator to get all accessible branch IDs for the current user
 * @example
 * @Get('inventory')
 * getInventory(@AccessibleBranchIds() branchIds: string[]) {
 *   return this.service.getInventoryByBranches(branchIds);
 * }
 */
export const AccessibleBranchIds = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.branchIds || [];
  },
);
