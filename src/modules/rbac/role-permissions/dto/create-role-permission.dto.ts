import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRolePermissionDto {
  @IsNotEmpty({ message: 'Role id is required' })
  @IsString({ message: 'Role id must be a string' })
  role_id: string;

  @IsNotEmpty({ message: 'Permission id is required' })
  @IsString({ message: 'Permission id must be a string' })
  permission_id: string;
}

export class UpdateRolePermissionDto extends PartialType(
  CreateRolePermissionDto,
) {}
