import { OrderItem } from 'src/modules/orders/entities/order-item.entity';
import { ProductStock } from 'src/modules/product-stocks/entities/product-stock.entity';
import { StockMovement } from 'src/modules/stock-movements/entities/stock-movement.entity';
import {
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
import { Product } from './product.entity';

@Entity('product_variants')
export class ProductVariant {
  @PrimaryColumn()
  id: string;

  @ManyToOne(() => Product, (product) => product.productVariants)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  name_variant: string;

  @Column()
  sku: string;

  @Column()
  weight: number;

  @Column()
  color: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Column()
  thumbnail: string;

  @OneToMany(() => ProductStock, (productStock) => productStock.productVariant)
  productStocks: ProductStock[];

  @OneToMany(
    () => StockMovement,
    (stockMovement) => stockMovement.productVariant,
  )
  stockMovements: StockMovement[];

  @OneToMany(() => OrderItem, (orderItem) => orderItem.variant)
  orderItems: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}
