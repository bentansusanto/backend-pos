import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/modules/rbac/users/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Check if user has a specific role
   */
  async userHasRole(userId: string, roleCode: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: {
        userRoles: {
          role: true,
        },
      },
    });

    if (!user || !user.userRoles) {
      return false;
    }

    return user.userRoles.some((ur) => ur.role.code === roleCode);
  }

  /**
   * Check if user has any of the specified roles
   */
  async userHasAnyRole(userId: string, roleCodes: string[]): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: {
        userRoles: {
          role: true,
        },
      },
    });

    if (!user || !user.userRoles) {
      return false;
    }

    const userRoles = user.userRoles.map((ur) => ur.role.code);
    return roleCodes.some((role) => userRoles.includes(role));
  }

  /**
   * Check if user has a specific permission
   */
  async userHasPermission(
    userId: string,
    module: string,
    action: string,
  ): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: {
        userRoles: {
          role: {
            rolePermissions: {
              permission: true,
            },
          },
        },
      },
    });

    if (!user || !user.userRoles) {
      return false;
    }

    for (const userRole of user.userRoles) {
      if (userRole.role && userRole.role.rolePermissions) {
        for (const rp of userRole.role.rolePermissions) {
          if (
            rp.permission &&
            rp.permission.module === module &&
            rp.permission.action === action
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: {
        userRoles: {
          role: {
            rolePermissions: {
              permission: true,
            },
          },
        },
      },
    });

    if (!user || !user.userRoles) {
      return [];
    }

    const permissions: string[] = [];
    user.userRoles.forEach((userRole) => {
      if (userRole.role && userRole.role.rolePermissions) {
        userRole.role.rolePermissions.forEach((rp) => {
          if (rp.permission) {
            permissions.push(`${rp.permission.module}:${rp.permission.action}`);
          }
        });
      }
    });

    return [...new Set(permissions)]; // Remove duplicates
  }

  /**
   * Get all roles for a user
   */
  async getUserRoles(userId: string): Promise<string[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: {
        userRoles: {
          role: true,
        },
      },
    });

    if (!user || !user.userRoles) {
      return [];
    }

    return user.userRoles.map((ur) => ur.role.code);
  }
}
