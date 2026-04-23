import Hashids from 'hashids';
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
import { Branch } from '../../branches/entities/branch.entity';
import { Accounts } from './account.entity';
import { JournalEntry } from './journal-entry.entity';

@Entity('journal_lines')
export class JournalLine {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now(), Math.floor(Math.random() * 9999));
    }
  }

  @ManyToOne(() => JournalEntry, (entry) => entry.journalLines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'journalEntryId' })
  journalEntry: JournalEntry;

  @Column()
  journalEntryId: string;

  @ManyToOne(() => Accounts, (account) => account.journalLines)
  @JoinColumn({ name: 'accountId' })
  account: Accounts;

  @Column()
  accountId: string;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column()
  branchId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  debit: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  credit: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
