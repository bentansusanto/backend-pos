import Hashids from 'hashids';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { PromotionRule } from 'src/modules/promotions/entities/promotion-rule.entity';
import { PromotionBranch } from 'src/modules/promotions/entities/promotion-branch.entity';
import { ManyToMany } from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now());
    }
  }

  @Column()
  name: string;

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];

  @ManyToMany(() => PromotionRule, (rule) => rule.conditionCategories)
  promotionRulesCondition: PromotionRule[];

  @ManyToMany(() => PromotionRule, (rule) => rule.actionCategories)
  promotionRulesAction: PromotionRule[];

  @ManyToMany(() => PromotionBranch, (branch) => branch.categories)
  promotionBranches: PromotionBranch[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
