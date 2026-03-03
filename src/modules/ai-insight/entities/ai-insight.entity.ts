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

export enum InsightType {
  SALES_TREND = 'sales_trend',
  STOCK_SUGGESTION = 'stock_suggestion',
  BEST_SELLER = 'best_seller',
  SLOW_MOVING = 'slow_moving',
  LOW_STOCK_ALERT = 'low_stock_alert',
  EXPIRY_ALERT = 'expiry_alert',
  ANOMALY_ALERT = 'anomaly_alert',
  PROMO_SUGGESTION = 'promo_suggestion',
  REPORT_SUMMARY = 'report_summary',
}

@Entity('ai_insights')
export class AiInsight {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now());
    }
  }

  @ManyToOne(() => Branch, (branch) => branch.aiInsights)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ type: 'enum', enum: InsightType })
  type: InsightType;

  @Column()
  summary: string;

  @Column({ type: 'json' })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
