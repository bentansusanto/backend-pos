import Hashids from 'hashids';
import { PurchaseReceiving } from 'src/modules/purchase_receivings/entities/purchase_receiving.entity';
import { ProductBatch } from 'src/modules/product-batches/entities/product-batch.entity';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('suppliers')
export class Supplier {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now());
    }
  }

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column()
  address: string;

  @Column()
  city: string;

  @Column()
  province: string;

  @Column()
  country: string;

  @Column()
  postalCode: string;

  @OneToMany(
    () => PurchaseReceiving,
    (purchaseReceiving) => purchaseReceiving.supplier,
  )
  purchaseReceivings: PurchaseReceiving[];

  @OneToMany(() => ProductBatch, (productBatch) => productBatch.supplier)
  productBatches: ProductBatch[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
