import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from '../rbac/permissions/entities/permission.entity';
import { RolePermission } from '../rbac/role-permissions/entities/role_permission.entity';
import { Role } from '../rbac/roles/entities/role.entity';
import { SeederService } from './seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, RolePermission])],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeederModule {}
