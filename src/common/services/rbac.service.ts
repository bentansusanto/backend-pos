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
        role: true,
      },
    });

    if (!user || !user.role) {
      return false;
    }

    return user.role.code === roleCode;
  }

  /**
   * Check if user has any of the specified roles
   */
  async userHasAnyRole(userId: string, roleCodes: string[]): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: {
        role: true,
      },
    });

    if (!user || !user.role) {
      return false;
    }

    return roleCodes.some((role) => user.role.code === role);
  }

  /**
   * Check if user has a specific permission
   */
  async userHasPermission(userId: string, action: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: {
        role: {
          rolePermissions: {
            permission: true,
          },
        },
      },
    });

    if (!user || !user.role || !user.role.rolePermissions) {
      return false;
    }

    for (const rp of user.role.rolePermissions) {
      if (rp.permission && rp.permission.action === action) {
        return true;
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
        role: {
          rolePermissions: {
            permission: true,
          },
        },
      },
    });

    if (!user || !user.role || !user.role.rolePermissions) {
      return [];
    }

    const permissions: string[] = [];
    user.role.rolePermissions.forEach((rp) => {
      if (rp.permission) {
        permissions.push(rp.permission.action);
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
        role: true,
      },
    });

    if (!user || !user.role) {
      return [];
    }

    return [user.role.code];
  }
}
