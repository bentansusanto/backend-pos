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
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now());
    }
  }
  @ManyToOne(() => Order, (order) => order.items)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ManyToOne(
    () => ProductVariant,
    (productVariant) => productVariant.orderItems,
  )
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant;

  @Column()
  quantity: number;

  @Column()
  price: number;

  @Column({ default: 0, nullable: true })
  discount: number;

  @Column({ default: 0 })
  subtotal: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
