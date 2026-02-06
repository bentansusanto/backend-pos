import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from '../rbac/roles/entities/permission.entity';
import { Role } from '../rbac/roles/entities/role.entity';
import { RolePermission } from '../rbac/roles/entities/role_permission.entity';
import { SeederService } from './seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, RolePermission])],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeederModule {}
