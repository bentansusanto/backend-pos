import Hashids from 'hashids';
import { Branch } from 'src/modules/branches/entities/branch.entity';
import { ProductVariant } from 'src/modules/products/entities/product-variant.entity';
import { Product } from 'src/modules/products/entities/product.entity';
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

@Entity('product_stocks')
export class ProductStock {
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

  @ManyToOne(() => Product, (productVariant) => productVariant.productStocks)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Branch, (branch) => branch.productStocks)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ default: 0 })
  stock: number;

  @Column({ default: 0 })
  minStock: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
