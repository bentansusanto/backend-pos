import Hashids from 'hashids';
import { Branch } from 'src/modules/branches/entities/branch.entity';
import { Purchase } from 'src/modules/purchases/entities/purchase.entity';
import { Supplier } from 'src/modules/supplier/entities/supplier.entity';
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
import { PurchaseReceivingItem } from './purchase_receiving_item.entity';

@Entity('purchase_receivings')
export class PurchaseReceiving {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now());
    }
  }

  @ManyToOne(() => Purchase)
  @JoinColumn({ name: 'purchase_id' })
  purchase: Purchase;

  @ManyToOne(() => Supplier, (supplier) => supplier.purchaseReceivings)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @ManyToOne(() => Branch, (branch) => branch.purchaseReceivings)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @OneToMany(() => PurchaseReceivingItem, (item) => item.purchaseReceiving)
  items: PurchaseReceivingItem[];

  @Column({ type: 'text' })
  note: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
