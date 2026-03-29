import Hashids from 'hashids';
import { Branch } from 'src/modules/branches/entities/branch.entity';
import { ProductVariant } from 'src/modules/products/entities/product-variant.entity';
import { ProductBatch } from 'src/modules/product-batches/entities/product-batch.entity';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';

export enum ReferenceType {
  SALE = 'sale',
  PURCHASE = 'purchase',
  ADJUST = 'adjust',
  RETURN_SALE = 'return_sale',
  RETURN_PURCHASE = 'return_purchase',
  EXPIRED = 'expired',
  DAMAGE = 'damage',
  OPENING_STOCK = 'opening_stock',
  STOCK_TAKE = 'stock_take',
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
    { nullable: true },
  )
  @JoinColumn({ name: 'variant_id' })
  productVariant: ProductVariant;

  @ManyToOne(() => Branch, (branch) => branch.stockMovements)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ type: 'enum', enum: ReferenceType })
  referenceType: ReferenceType;

  // Optional link to a specific product batch — used for FEFO deductions and batch movement history
  @ManyToOne(() => ProductBatch, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'batch_id' })
  batch: ProductBatch;

  @RelationId((movement: StockMovement) => movement.batch)
  batchId: string;

  @Column({ default: 0 })
  qty: number;

  @Column()
  referenceId: string;

  @Column({ type: "varchar", nullable: true })
  reason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
