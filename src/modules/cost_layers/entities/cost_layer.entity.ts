import Hashids from 'hashids';
import { ProductVariant } from 'src/modules/products/entities/product-variant.entity';
import { ReferenceType } from 'src/modules/stock-movements/entities/stock-movement.entity';
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

@Entity('cost_layers')
export class CostLayer {
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
    (productVariant) => productVariant.costLayers,
  )
  @JoinColumn({ name: 'product_variant_id' })
  productVariant: ProductVariant;

  @Column()
  ref_type: ReferenceType;

  @Column()
  amount: number;

  @Column()
  date: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
