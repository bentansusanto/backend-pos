import {
  BeforeInsert,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import Hashids from 'hashids';
import { Promotion } from './promotion.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { ProductVariant } from '../../products/entities/product-variant.entity';
import { Category } from '../../products/entities/category.entities';

@Entity('promotion_branches')
export class PromotionBranch {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now() + Math.floor(Math.random() * 1000) + 2);
    }
  }

  @ManyToOne(() => Promotion, (promotion) => promotion.branchRelations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promotion_id' })
  promotion: Promotion;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @ManyToMany(() => ProductVariant)
  @JoinTable({ name: 'promotion_branch_variants' })
  variants: ProductVariant[];

  @ManyToMany(() => Category)
  @JoinTable({ name: 'promotion_branch_categories' })
  categories: Category[];
}
