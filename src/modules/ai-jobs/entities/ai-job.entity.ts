import Hashids from 'hashids';
import { Branch } from 'src/modules/branches/entities/branch.entity';
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

export enum AiJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('ai_jobs')
export class AiJob {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now());
    }
  }

  @ManyToOne(() => Branch, (branch) => branch.aiJobs)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ type: 'enum', enum: AiJobStatus, default: AiJobStatus.PENDING })
  status: AiJobStatus;

  @Column({ type: 'json' })
  payload: string[];

  @Column({ type: 'json', nullable: true })
  result: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
