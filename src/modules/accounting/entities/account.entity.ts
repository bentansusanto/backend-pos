import Hashids from 'hashids';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AccountType, CashflowType } from './accounting.enums';
import { JournalLine } from './journal-line.entity';

@Entity('accounts')
export class Accounts {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now());
    }
  }

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: AccountType })
  type: AccountType;

  @Column()
  category: string;

  @Column({ type: 'enum', enum: CashflowType, nullable: true })
  cashflowType: CashflowType;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => JournalLine, (line) => line.account)
  journalLines: JournalLine[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
