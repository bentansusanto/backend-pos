import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from '../rbac/permissions/entities/permission.entity';
import { RolePermission } from '../rbac/role-permissions/entities/role_permission.entity';
import { Role } from '../rbac/roles/entities/role.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { PromotionRule } from '../promotions/entities/promotion-rule.entity';
import { PromotionBranch } from '../promotions/entities/promotion-branch.entity';
import { Branch } from '../branches/entities/branch.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Category } from '../products/entities/category.entities';
import { ReasonCategory } from '../reason-categories/entities/reason-category.entity';
import { SeederService } from './seeder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Role,
      Permission,
      RolePermission,
      Promotion,
      PromotionRule,
      PromotionBranch,
      Branch,
      ProductVariant,
      Category,
      ReasonCategory,
    ]),
  ],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeederModule {}
