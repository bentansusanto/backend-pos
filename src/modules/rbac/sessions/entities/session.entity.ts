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
import { User } from '../../users/entities/user.entity';

@Entity('sessions')
export class Session {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now());
    }
  }

  @ManyToOne(() => User, (user) => user.sessions, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  ip: string;

  @Column()
  token: string; 

  @Column()
  lastActivityAt: Date;

  @Column()
  expiresAt: Date;

  @Column({ name: 'current_branch_id', nullable: true })
  currentBranchId: string;

  @ManyToOne('Branch', { nullable: true })
  @JoinColumn({ name: 'current_branch_id' })
  currentBranch: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
