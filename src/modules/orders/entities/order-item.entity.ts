import Hashids from 'hashids';
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
  @ManyToOne(() => Order, (order) => order.items, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => Product, (product) => product.orderItems, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(
    () => ProductVariant,
    (productVariant) => productVariant.orderItems,
    { nullable: true },
  )
  @JoinColumn({ name: 'variant_id' })
  variant?: ProductVariant;

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
