import Hashids from "hashids";
import { Branch } from "src/modules/branches/entities/branch.entity";
import { BeforeInsert, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { ExpenseCategory } from "./expense-categories.entity";

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

    @ManyToOne(() => Branch, (branch) => branch.expenses)
    @JoinColumn({ name: 'branch_id' })
    branch: Branch;

    @Column()
    category_id: string

    @ManyToOne(() => ExpenseCategory, (expenseCategory) => expenseCategory.expenses)
    @JoinColumn({ name: 'category_id' })
    expenseCategory: ExpenseCategory;

    @ManyToOne(() => Branch, (branch) => branch.expenses)
    @JoinColumn({ name: 'branch_id' })
    branche: Branch;

    @Column()
    amount: number;

    @Column({type: 'text', nullable: true})
    note: string;

    @Column()
    expense_date: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
