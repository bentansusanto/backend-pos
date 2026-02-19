import Hashids from 'hashids';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from './category.entities';
import { ProductVariant } from './product-variant.entity';
import { OrderItem } from 'src/modules/orders/entities/order-item.entity';
import { ProductStock } from 'src/modules/product-stocks/entities/product-stock.entity';
import { StockMovement } from 'src/modules/stock-movements/entities/stock-movement.entity';

@Entity('products')
export class Product {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now());
    }
  }

  @Column()
  name_product: string;

  @Column()
  slug: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @ManyToOne(() => Category, (category) => category.products)
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @OneToMany(() => ProductVariant, (productVariant) => productVariant.product, {
    cascade: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  productVariants: ProductVariant[];

  @Column({ nullable: true, type: 'jsonb' })
  images: string[];

  @Column()
  thumbnail: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.product, {
    cascade: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  orderItems: OrderItem[];

  @OneToMany(() => ProductStock, (productStock) => productStock.product, {
    cascade: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  productStocks: ProductStock[];

  @OneToMany(() => StockMovement, (stockMovement) => stockMovement.product, {
    cascade: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  stockMovements: StockMovement[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
