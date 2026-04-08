import Hashids from 'hashids';
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
import { Purchase } from './purchase.entity';
import { ProductVariant } from '../../products/entities/product-variant.entity';

@Entity('purchase_items')
export class PurchaseItems {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now(), Math.floor(Math.random() * 9999));
    }
  }

  @ManyToOne(() => Purchase, (purchase) => purchase.purchaseItems)
  @JoinColumn({ name: 'purchase_id' })
  purchase: Purchase;

  @ManyToOne(() => ProductVariant)
  @JoinColumn({ name: 'product_variant_id' })
  productVariant: ProductVariant;

  @Column()
  product_variant_id: string;

  @Column()
  quantity: number;

  @Column()
  price: number;

  @Column()
  total: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
