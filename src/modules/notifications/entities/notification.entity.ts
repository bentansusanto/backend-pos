import { Entity, Column, CreateDateColumn, UpdateDateColumn, Index, PrimaryColumn, BeforeInsert } from 'typeorm';
import Hashids from 'hashids';

export enum NotificationType {
  ANOMALY = 'anomaly',
  SESSION = 'session',
  INFO = 'info',
  SYSTEM = 'system',
}

@Entity('notifications')
export class Notification {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now());
    }
  }

  @Index()
  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.INFO,
  })
  type: NotificationType;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column('jsonb', { nullable: true })
  metadata: any;

  @Column({ default: false })
  is_read: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // We can add user_id if we want targeted notifications, 
  // but for global admin/owner notifications, we can keep it null 
  // or add a recipient_role field.
}
