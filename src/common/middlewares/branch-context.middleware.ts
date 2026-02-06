import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NextFunction, Request, Response } from 'express';
import { UserBranch } from 'src/modules/branches/entities/user-branch.entity';
import { User } from 'src/modules/rbac/users/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class BranchContextMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(UserBranch)
    private userBranchRepository: Repository<UserBranch>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user as User;

    // If no user or no branches, skip branch context
    if (!user || !user.userBranches || user.userBranches.length === 0) {
      return next();
    }

    // Get all accessible branches for the user
    const accessibleBranches = user.userBranches
      .filter((ub: any) => ub.isActive)
      .map((ub: any) => ({
        branchId: ub.branchId,
        branch: ub.branch,
        isActive: ub.isActive,
      }));

    // If user has no active branches, skip
    if (accessibleBranches.length === 0) {
      return next();
    }

    // Extract all branch IDs
    const branchIds = accessibleBranches.map((b) => b.branchId);

    // Attach to request for use in controllers
    (req as any).branchIds = branchIds;
    (req as any).accessibleBranches = accessibleBranches;

    // Check for X-Branch-Id header to determine which branch to use
    const requestedBranchId = req.headers['x-branch-id'] as string;

    let selectedBranch;

    if (requestedBranchId) {
      // User is requesting a specific branch
      selectedBranch = accessibleBranches.find(
        (b) => b.branchId === requestedBranchId,
      );

      if (!selectedBranch) {
        // User doesn't have access to the requested branch
        throw new ForbiddenException(
          `You do not have access to branch with ID: ${requestedBranchId}`,
        );
      }
    } else {
      // No specific branch requested, use first active branch as default
      selectedBranch = accessibleBranches[0];
    }

    // Set the selected branch context
    (req as any).branchId = selectedBranch.branchId;
    (req as any).branch = selectedBranch.branch;

    next();
  }
}
