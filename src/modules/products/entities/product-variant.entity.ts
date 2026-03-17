import Hashids from 'hashids';
import { OrderItem } from 'src/modules/orders/entities/order-item.entity';
import { ProductStock } from 'src/modules/product-stocks/entities/product-stock.entity';
import { StockMovement } from 'src/modules/stock-movements/entities/stock-movement.entity';
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
import { Product } from './product.entity';
import { CostLayer } from 'src/modules/cost_layers/entities/cost_layer.entity';
import { PurchaseReceivingItem } from 'src/modules/purchase_receivings/entities/purchase_receiving_item.entity';

@Entity('product_variants')
export class ProductVariant {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now());
    }
  }

  @ManyToOne(() => Product, (product) => product.productVariants)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  name_variant: string;

  @Column()
  sku: string;

  @Column({ nullable: true })
  weight?: number;

  @Column({ nullable: true })
  color?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost_price: number;

  @Column({ nullable: true })
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

  @OneToMany(() => CostLayer, (costLayer) => costLayer.productVariant)
  costLayers: CostLayer[];

  @OneToMany(() => PurchaseReceivingItem, (purchaseReceivingItem) => purchaseReceivingItem.productVariant)
  purchaseReceivingItems: PurchaseReceivingItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}
