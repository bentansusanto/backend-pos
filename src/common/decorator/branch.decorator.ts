import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to get the current branch object from request context
 * @example
 * @Get('dashboard')
 * getDashboard(@CurrentBranch() branch: Branch) {
 *   return this.service.getData(branch);
 * }
 */
/**
 * Decorator to get the current branch object from request context
 */
export const CurrentBranch = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    if (request.branch) return request.branch;

    const user = request.user;
    if (user && user.userBranches && user.userBranches.length > 0) {
      // Return the full branch object if possible
      const headerBranchId = request.headers['x-branch-id'];
      if (headerBranchId) {
        const found = user.userBranches.find(
          (ub: any) => ub.branchId === headerBranchId || ub.branch?.id === headerBranchId,
        );
        if (found) return found.branch;
      }
      return user.userBranches[0].branch;
    }
    return undefined;
  },
);

/**
 * Decorator to get the current branch ID from request context
 */
export const CurrentBranchId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    if (request.branchId) return request.branchId;

    const headerBranchId = request.headers['x-branch-id'];
    if (headerBranchId) return headerBranchId;

    const user = request.user;
    if (user && user.userBranches && user.userBranches.length > 0) {
      return (
        user.userBranches[0].branchId ||
        user.userBranches[0].branch?.id ||
        user.userBranches[0].id
      );
    }
    return undefined;
  },
);

/**
 * Decorator to get all accessible branches for the current user
 */
export const AccessibleBranches = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    if (request.accessibleBranches) return request.accessibleBranches;

    const user = request.user;
    if (user && user.userBranches) {
      return user.userBranches.map((ub: any) => ub.branch);
    }
    return [];
  },
);

/**
 * Decorator to get all accessible branch IDs for the current user
 */
export const AccessibleBranchIds = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    if (request.branchIds) return request.branchIds;

    const user = request.user;
    if (user && user.userBranches) {
      return user.userBranches.map(
        (ub: any) => ub.branchId || ub.branch?.id || ub.id,
      );
    }
    return [];
  },
);
