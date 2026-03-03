import Hashids from "hashids";
import { Branch } from "src/modules/branches/entities/branch.entity";
import { BeforeInsert, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { Expense } from "./expense.entity";

@Entity('expense_categories')
export class ExpenseCategory {
    @PrimaryColumn()
    id: string;

    @BeforeInsert()
    generateId() {
        if (!this.id) {
            this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now());
        }
    }

    @OneToMany(() => Expense, (expense) => expense.expenseCategory)
    expenses: Expense[];

    @Column()
    name: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
