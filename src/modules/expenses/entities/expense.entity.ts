import Hashids from 'hashids';
import { Branch } from 'src/modules/branches/entities/branch.entity';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ExpenseCategory } from './expense-category.entity';

@Entity('expenses')
export class Expense {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now());
    }
  }

  @OneToMany(() => Branch, (branch) => branch.expenses)
  branch: Branch;

  @ManyToOne(
    () => ExpenseCategory,
    (expenseCategory) => expenseCategory.expenses,
  )
  expense_category: ExpenseCategory;

  @Column({ unique: true })
  expense_code: string;

  @Column()
  amount: number;

  @Column()
  description: string;

  @Column()
  notes: string;

  @Column()
  expense_date: Date;

  @Column()
  payment_method: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
