import Hashids from 'hashids';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ReasonCategoryType {
  REFUND = 'refund',
  POS_SESSION = 'pos_session',
}

@Entity('reason_categories')
export class ReasonCategory {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now());
    }
  }

  @Column({
    type: 'enum',
    enum: ReasonCategoryType,
  })
  type: ReasonCategoryType;

  @Column()
  label: string;

  @Column()
  value: string;

  @Column({ default: 0 })
  min_description_length: number;

  @Column({ default: false })
  is_anomaly_trigger: boolean;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
