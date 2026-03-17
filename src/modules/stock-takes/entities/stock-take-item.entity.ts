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
import { StockTake } from './stock-take.entity';

@Entity('stock_take_items')
export class StockTakeItem {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now());
    }
  }

  @ManyToOne(() => StockTake, (stockTake) => stockTake.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'stock_take_id' })
  stockTake: StockTake;

  @ManyToOne(() => ProductVariant)
  @JoinColumn({ name: 'variant_id' })
  productVariant: ProductVariant;

  @Column({ default: 0 })
  systemQty: number;

  @Column({ default: 0 })
  countedQty: number;

  @Column({ default: 0 })
  difference: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
