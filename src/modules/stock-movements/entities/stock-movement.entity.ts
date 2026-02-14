import Hashids from 'hashids';
import { Branch } from 'src/modules/branches/entities/branch.entity';
import { ProductBatch } from 'src/modules/product-batches/entities/product-batch.entity';
import { ProductVariant } from 'src/modules/products/entities/product-variant.entity';
import {
  BeforeInsert,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

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

  @ManyToOne(() => ProductBatch, (productBatch) => productBatch.stockMovements)
  @JoinColumn({ name: 'product_batch_id' })
  productBatch: ProductBatch;

  @ManyToOne(() => ProductVariant, (productVariant) => productVariant.stockMovements)
  @JoinColumn({ name: 'variant_id' })
  productVariant: ProductVariant;

  @ManyToOne(() => Branch, (branch) => branch.stockMovements)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
