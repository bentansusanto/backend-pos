import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import Hashids from 'hashids';
import { PromotionStatus } from '../enums/promotion.enum';
import { PromotionRule } from './promotion-rule.entity';
import { PromotionBranch } from './promotion-branch.entity';

@Entity('promotions')
export class Promotion {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now() + Math.floor(Math.random() * 1000));
    }
  }

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: PromotionStatus,
    default: PromotionStatus.ACTIVE,
  })
  status: PromotionStatus;

  @Column({ default: 0 })
  priority: number;

  @Column({ default: true })
  isStackable: boolean;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @OneToMany(() => PromotionRule, (rule) => rule.promotion, { cascade: true })
  rules: PromotionRule[];

  @OneToMany(() => PromotionBranch, (pb) => pb.promotion, { cascade: true })
  branchRelations: PromotionBranch[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
