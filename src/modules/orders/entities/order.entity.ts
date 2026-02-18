import Hashids from 'hashids';
import { Branch } from 'src/modules/branches/entities/branch.entity';
import { Customer } from 'src/modules/customers/entities/customer.entity';
import { User } from 'src/modules/rbac/users/entities/user.entity';
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
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('orders')
export class Order {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now());
    }
  }

  @ManyToOne(() => Branch, (branch) => branch.orders)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  // user as cashier
  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Customer, (customer) => customer.orders)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order)
  items: OrderItem[];

  @Column()
  invoice_number: string;

  @Column({ default: 0 })
  subtotal: number;

  @Column({ default: 0, nullable: true })
  tax_amount: number;

  @Column({ default: 0, nullable: true })
  discount_amount?: number;

  @Column({ default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
