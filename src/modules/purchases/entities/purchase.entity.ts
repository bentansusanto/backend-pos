import Hashids from 'hashids';
import { Branch } from 'src/modules/branches/entities/branch.entity';
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
import { PurchaseItems } from './purchase-items.entity';

@Entity('purchases')
export class Purchase {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now());
    }
  }

  @Column({ default: 'PENDING' })
  status: string;

  @Column()
  supplier_id: string;

  @ManyToOne(() => Branch, (branch) => branch.purchases)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @OneToMany(() => PurchaseItems, (purchaseItems) => purchaseItems.purchase)
  purchaseItems: PurchaseItems[];

  @Column()
  total: number;

  @Column()
  paid_amount: number;

  @Column()
  change_amount: number;

  @Column()
  payment_method: string;

  @Column()
  note: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
