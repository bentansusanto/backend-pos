import Hashids from 'hashids';
import { ProductBatch } from 'src/modules/product-batches/entities/product-batch.entity';
import { ProductStock } from 'src/modules/product-stocks/entities/product-stock.entity';
import { StockMovement } from 'src/modules/stock-movements/entities/stock-movement.entity';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('branches')
export class Branch {
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

  @Column({ unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  province: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany('UserBranch', 'branch', {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  userBranches: any[];

  @OneToMany(() => ProductStock, (productStock) => productStock.branch)
  productStocks: ProductStock[];

  @OneToMany(() => ProductBatch, (productBatch) => productBatch.branch)
  productBatches: ProductBatch[];

  @OneToMany(() => StockMovement, (stockMovement) => stockMovement.branch)
  stockMovements: StockMovement[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
