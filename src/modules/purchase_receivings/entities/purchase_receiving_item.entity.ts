import Hashids from 'hashids';
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
import { PurchaseReceiving } from './purchase_receiving.entity';

@Entity('purchase_receiving_items')
export class PurchaseReceivingItem {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now());
    }
  }

  @ManyToOne(
    () => PurchaseReceiving,
    (purchaseReceiving) => purchaseReceiving.items,
  )
  @JoinColumn({ name: 'purchase_receiving_id' })
  purchaseReceiving: PurchaseReceiving;

  @ManyToOne(
    () => ProductVariant,
    (productVariant) => productVariant.purchaseReceivingItems,
  )
  @JoinColumn({ name: 'product_variant_id' })
  productVariant: ProductVariant;

  @Column()
  qty: number;

  @Column()
  cost: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
