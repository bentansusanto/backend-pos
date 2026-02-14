import Hashids from 'hashids';
import { Branch } from 'src/modules/branches/entities/branch.entity';
import { ProductVariant } from 'src/modules/products/entities/product-variant.entity';
import { StockMovement } from 'src/modules/stock-movements/entities/stock-movement.entity';
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

  @ManyToOne(
    () => ProductVariant,
    (productVariant) => productVariant.productStocks,
  )
  @JoinColumn({ name: 'variant_id' })
  productVariant: ProductVariant;

  @ManyToOne(() => Branch, (branch) => branch.productStocks)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column()
  batch_code: string;

  @Column({ type: 'date' })
  exp_date: Date; // expiration date in days

  @Column({ default: 0 })
  qty: number;

  @OneToMany(() => StockMovement, (stockMovement) => stockMovement.productBatch)
  stockMovements: StockMovement[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
