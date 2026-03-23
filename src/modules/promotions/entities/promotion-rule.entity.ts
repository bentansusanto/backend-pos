import Hashids from 'hashids';
import {
  BeforeInsert,
  Column,
  Entity,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import {
  PromotionActionType,
  PromotionConditionType,
} from '../enums/promotion.enum';
import { Promotion } from './promotion.entity';
import { ProductVariant } from '../../products/entities/product-variant.entity';
import { Category } from '../../products/entities/category.entities';
import { JoinTable, ManyToMany } from 'typeorm';

@Entity('promotion_rules')
export class PromotionRule {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(
        Date.now() + Math.floor(Math.random() * 1000) + 1,
      );
    }
  }

  @ManyToOne(() => Promotion, (promotion) => promotion.rules, {
    onDelete: 'CASCADE',
  })
  promotion: Promotion;

  @Column({ type: 'enum', enum: PromotionConditionType })
  conditionType: PromotionConditionType;

  @Column({ type: 'json' })
  conditionValue: any;

  @ManyToMany(() => ProductVariant)
  @JoinTable({ name: 'promotion_rule_condition_variants' })
  conditionVariants: ProductVariant[];

  @ManyToMany(() => Category)
  @JoinTable({ name: 'promotion_rule_condition_categories' })
  conditionCategories: Category[];

  @Column({ type: 'enum', enum: PromotionActionType })
  actionType: PromotionActionType;

  @Column({ type: 'json' })
  actionValue: any;

  @ManyToMany(() => ProductVariant)
  @JoinTable({ name: 'promotion_rule_action_variants' })
  actionVariants: ProductVariant[];

  @ManyToMany(() => Category)
  @JoinTable({ name: 'promotion_rule_action_categories' })
  actionCategories: Category[];
}
