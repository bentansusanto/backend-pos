import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from 'src/modules/rbac/users/entities/user.entity';
import { PERMISSIONS_KEY } from '../decorator/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorator/public.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    let requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions are explicitly required, try to infer them from the controller and handler
    if (!requiredPermissions || requiredPermissions.length === 0) {
      const controllerClass = context.getClass();
      const handler = context.getHandler();

      // Get controller path metadata
      const controllerPath = this.reflector.get<string | string[]>(
        'path',
        controllerClass,
      );

      // Extract the first path segment if it's an array or string
      let resource = '';
      if (Array.isArray(controllerPath)) {
        resource = controllerPath[0];
      } else if (typeof controllerPath === 'string') {
        resource = controllerPath;
      }

      // Clean up resource name (remove leading slash if present)
      resource = resource.startsWith('/') ? resource.substring(1) : resource;

      // Normalize resource name (replace hyphens with underscores)
      resource = resource.replace(/-/g, '_');

      if (resource) {
        const methodName = handler.name;
        let action = methodName;

        // Map common method names to standard actions
        const lowerMethodName = methodName.toLowerCase();
        if (lowerMethodName === 'create') action = 'create';
        else if (
          lowerMethodName === 'findall' ||
          lowerMethodName === 'findone' ||
          lowerMethodName === 'findbyid' ||
          lowerMethodName === 'getuser'
        )
          action = 'read';
        else if (
          lowerMethodName.startsWith('get') ||
          lowerMethodName.startsWith('find')
        )
          action = 'read';
        else if (lowerMethodName === 'update') action = 'update';
        else if (lowerMethodName === 'remove' || lowerMethodName === 'delete')
          action = 'delete';
        else if (lowerMethodName === 'assignpermissions')
          action = 'assign_permissions';

        requiredPermissions = [`${resource}:${action}`];
      } else {
        // If we can't infer a resource, we assume no permission is required (public)
        // or strictly deny. For now, let's allow it to not break non-resource controllers.
        return true;
      }
    }

    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    if (!user || !user.role || !user.role.rolePermissions) {
      throw new ForbiddenException('User does not have required permissions');
    }

    // Collect all permissions from all user roles
    const userPermissions: string[] = [];
    if (user.role && user.role.rolePermissions) {
      user.role.rolePermissions.forEach((rp) => {
        if (rp.permission) {
          const permissionString = rp.permission.action;
          userPermissions.push(permissionString);
        }
      });
    }

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
