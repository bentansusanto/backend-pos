import { Exclude } from 'class-transformer';
import Hashids from 'hashids';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
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

  @Column()
  @Exclude()
  password: string;

  @Column()
  name: string;

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

  @Column({ default: true })
  isActive: boolean;

  @OneToOne(() => Profile, (profile) => profile.user)
  profile: Profile;

  @Column({ type: 'text', nullable: true })
  verify_code: string;

  @Column({ type: 'timestamp', nullable: true })
  exp_verify_at: Date;

  @Column({ type: 'boolean', default: false })
  is_verified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
