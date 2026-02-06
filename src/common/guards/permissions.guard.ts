import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from 'src/modules/rbac/users/entities/user.entity';
import { PERMISSIONS_KEY } from '../decorator/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    if (!user || !user.userRoles) {
      throw new ForbiddenException('User does not have required permissions');
    }

    // Collect all permissions from all user roles
    const userPermissions: string[] = [];
    user.userRoles.forEach((userRole) => {
      if (userRole.role && userRole.role.rolePermissions) {
        userRole.role.rolePermissions.forEach((rp) => {
          if (rp.permission) {
            const permissionString = `${rp.permission.module}:${rp.permission.action}`;
            userPermissions.push(permissionString);
          }
        });
      }
    });

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        `User does not have required permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
