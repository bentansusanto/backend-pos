import Hashids from 'hashids';
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
import { Branch } from '../../branches/entities/branch.entity';
import { ReferenceType } from './accounting.enums';
import { JournalLine } from './journal-line.entity';

@Entity('journal_entries')
export class JournalEntry {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now());
    }
  }

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'enum', enum: ReferenceType })
  referenceType: ReferenceType;

  @Column({ nullable: true })
  referenceCode: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column({ nullable: true })
  branchId: string;

  @OneToMany(() => JournalLine, (line) => line.journalEntry, { cascade: true })
  journalLines: JournalLine[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
