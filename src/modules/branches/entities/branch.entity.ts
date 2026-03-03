import Hashids from 'hashids';
import { AiInsight } from 'src/modules/ai-insight/entities/ai-insight.entity';
import { AiJob } from 'src/modules/ai-jobs/entities/ai-job.entity';
import { Expense } from 'src/modules/expenses/entities/expense.entity';
import { Order } from 'src/modules/orders/entities/order.entity';
import { ProductStock } from 'src/modules/product-stocks/entities/product-stock.entity';
import { PurchaseReceiving } from 'src/modules/purchase_receivings/entities/purchase_receiving.entity';
import { Purchase } from 'src/modules/purchases/entities/purchase.entity';
import { StockMovement } from 'src/modules/stock-movements/entities/stock-movement.entity';
import { Tax } from 'src/modules/tax/entities/tax.entity';
import { UserLog } from 'src/modules/user_logs/entities/user_log.entity';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
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

  // default tax applied automatically when creating orders in this branch
  @ManyToOne(() => Tax, (tax) => tax.branches, { nullable: true, eager: true })
  @JoinColumn({ name: 'default_tax_id' })
  defaultTax?: Tax;

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

  @OneToMany(() => Purchase, (purchase) => purchase.branch)
  purchases: Purchase[];

  @OneToMany(() => Expense, (expense) => expense.branch)
  expenses: Expense[];

  @OneToMany(
    () => PurchaseReceiving,
    (purchaseReceiving) => purchaseReceiving.branch,
  )
  purchaseReceivings: PurchaseReceiving[];

  @OneToMany(() => AiJob, (aiJob) => aiJob.branch)
  aiJobs: AiJob[];

  @OneToMany(() => AiInsight, (aiInsight) => aiInsight.branch)
  aiInsights: AiInsight[];

  @OneToMany(() => UserLog, (userLog) => userLog.branch)
  userLogs: UserLog[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
