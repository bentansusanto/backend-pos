import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserLogsModule } from '../user_logs/user_logs.module';
import { Promotion } from './entities/promotion.entity';
import { PromotionRule } from './entities/promotion-rule.entity';
import { PromotionBranch } from './entities/promotion-branch.entity';
import { Branch } from '../branches/entities/branch.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Category } from '../products/entities/category.entities';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Promotion,
      PromotionRule,
      PromotionBranch,
      Branch,
      ProductVariant,
      Category,
    ]),
    UserLogsModule,
  ],
  controllers: [PromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
