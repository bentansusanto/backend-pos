import Hashids from 'hashids';
import { Branch } from 'src/modules/branches/entities/branch.entity';
import { User } from 'src/modules/rbac/users/entities/user.entity';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StockTakeItem } from './stock-take-item.entity';

export enum StockTakeStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
}

@Entity('stock_takes')
export class StockTake {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now());
    }
  }

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: StockTakeStatus,
    default: StockTakeStatus.DRAFT,
  })
  status: StockTakeStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => StockTakeItem, (item: StockTakeItem) => item.stockTake, {
    cascade: true,
  })
  items: StockTakeItem[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approvedBy: User;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'boolean', default: false })
  isFrozen: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;
}
