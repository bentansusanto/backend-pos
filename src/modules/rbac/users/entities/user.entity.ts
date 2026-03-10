import { Exclude } from 'class-transformer';
import Hashids from 'hashids';
import { Order } from 'src/modules/orders/entities/order.entity';
import { UserLog } from 'src/modules/user_logs/entities/user_log.entity';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Profile } from '../../profiles/entities/profile.entity';
import { Role } from '../../roles/entities/role.entity';

@Entity('users')
export class User {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now());
    }
  }

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  @Exclude()
  password: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  pin: string;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  avatar: string;

  @OneToMany('UserBranch', 'user', {
    cascade: true,
    eager: false,
  })
  userBranches: any[];

  @ManyToOne(() => Role, (role) => role.users, {
    eager: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  role: Role;

  @OneToMany('Session', 'user', {
    cascade: true,
  })
  sessions: any[];

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @OneToOne(() => Profile, (profile) => profile.user)
  profile: Profile;

  @Column({ type: 'text', nullable: true })
  verify_code: string;

  @Column({ type: 'timestamp', nullable: true })
  exp_verify_at: Date;

  @Column({ type: 'boolean', default: false })
  is_verified: boolean;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => UserLog, (userLog) => userLog.user)
  userLogs: UserLog[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}
