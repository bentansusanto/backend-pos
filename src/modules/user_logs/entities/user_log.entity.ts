import Hashids from 'hashids';
import { Branch } from 'src/modules/branches/entities/branch.entity';
import { User } from 'src/modules/rbac/users/entities/user.entity';
import { BeforeInsert, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export enum EntityType {
  PRODUCT = 'product',
  PRODUCT_VARIANT = 'product_variant',
  SALE = 'sale',
  PURCHASE = 'purchase',
  PURCHASE_RECEIVING = 'purchase_receiving',
  STOCK_MOVEMENT = 'stock_movement',
  STOCK_ADJUSTMENT = 'stock_adjustment',
  CUSTOMER = 'customer',
  SUPPLIER = 'supplier',
  EXPENSE = 'expense',
  USER = 'user',
}

export enum ActionType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  APPROVE = 'approve',
  CANCEL = 'cancel',
}

@Entity('user_logs')
export class UserLog {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now());
    }
  }

  @ManyToOne(() => User, (user) => user.userLogs)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Branch, (branch) => branch.userLogs)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({
    type: 'varchar',
  })
  entity_type: EntityType;

  @Column({
    type: 'varchar',
  })
  action: ActionType;

  @Column({ nullable: true })
  entity_id: string;

  @Column({type: 'text'})
  description: string;

  @Column({type: 'jsonb', nullable: true})
  metadata: any;

  @Column({nullable: true})
  ip_address: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
