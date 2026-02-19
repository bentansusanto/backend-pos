import Hashids from 'hashids';
import { AiInsight } from 'src/modules/ai-insight/entities/ai-insight.entity';
import { AiJob } from 'src/modules/ai-jobs/entities/ai-job.entity';
import { Order } from 'src/modules/orders/entities/order.entity';
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

  @OneToMany(() => Order, (order) => order.branch)
  orders: Order[];

  @OneToMany(() => ProductStock, (productStock) => productStock.branch)
  productStocks: ProductStock[];

  @OneToMany(() => StockMovement, (stockMovement) => stockMovement.branch)
  stockMovements: StockMovement[];

  @OneToMany(() => AiJob, (aiJob) => aiJob.branch)
  aiJobs: AiJob[];

  @OneToMany(() => AiInsight, (aiInsight) => aiInsight.branch)
  aiInsights: AiInsight[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
