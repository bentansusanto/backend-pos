import Hashids from 'hashids';
import { Branch } from 'src/modules/branches/entities/branch.entity';

import { ProductVariant } from 'src/modules/products/entities/product-variant.entity';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum referenceType {
  SALE = 'sale',
  PURCHASE = 'purchase',
  ADJUST = 'adjust',
}

@Entity('stock_movements')
export class StockMovement {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now());
    }
  }

  @ManyToOne(
    () => ProductVariant,
    (productVariant) => productVariant.stockMovements,
  )
  @JoinColumn({ name: 'variant_id' })
  productVariant: ProductVariant;

  @ManyToOne(() => Branch, (branch) => branch.stockMovements)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ type: 'enum', enum: referenceType })
  referenceType: referenceType;

  @Column({ default: 0 })
  qty: number;

  @Column()
  referenceId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
