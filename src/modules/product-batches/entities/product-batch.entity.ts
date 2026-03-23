import Hashids from 'hashids';
import { Branch } from 'src/modules/branches/entities/branch.entity';
import { ProductVariant } from 'src/modules/products/entities/product-variant.entity';
import { Supplier } from 'src/modules/supplier/entities/supplier.entity';
import { PurchaseReceiving } from 'src/modules/purchase_receivings/entities/purchase_receiving.entity';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';

export enum ProductBatchStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  HOLD = 'hold',
  SOLD_OUT = 'sold_out',
}

@Entity('product_batches')
export class ProductBatch {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now());
    }
  }

  @Column({ nullable: true })
  batchNumber: string;

  @ManyToOne(() => ProductVariant, (productVariant) => productVariant.productBatches)
  @JoinColumn({ name: 'product_variant_id' })
  productVariant: ProductVariant;

  @RelationId((batch: ProductBatch) => batch.productVariant)
  productVariantId: string;

  @ManyToOne(() => Branch, (branch) => branch.productBatches)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @RelationId((batch: ProductBatch) => batch.branch)
  branchId: string;

  @ManyToOne(() => Supplier, { nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @RelationId((batch: ProductBatch) => batch.supplier)
  supplierId: string;

  @ManyToOne(() => PurchaseReceiving, { nullable: true })
  @JoinColumn({ name: 'purchase_receiving_id' })
  purchaseReceiving: PurchaseReceiving;

  @RelationId((batch: ProductBatch) => batch.purchaseReceiving)
  purchaseReceivingId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  initialQuantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  currentQuantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  costPrice: number;

  @Column({ type: 'date', nullable: true })
  manufacturingDate: Date;

  @Column({ type: 'date', nullable: true })
  expiryDate: Date;

  @Column({ type: 'date', nullable: true })
  receivedDate: Date;

  @Column({
    type: 'enum',
    enum: ProductBatchStatus,
    default: ProductBatchStatus.ACTIVE,
  })
  status: ProductBatchStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
