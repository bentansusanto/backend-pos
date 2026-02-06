import { Exclude } from 'class-transformer';
import Hashids from 'hashids';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from './user-role.entity';
import { Profile } from './profile.entity';

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
  fullName: string;

  @Column({ nullable: true })
  avatar: string;

  @OneToMany('UserBranch', 'user', {
    cascade: true,
    eager: false,
  })
  userBranches: any[];

  @OneToMany(() => UserRole, (userRole) => userRole.user, {
    cascade: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  userRoles: UserRole[];

  @OneToMany('Session', 'user', {
    cascade: true,
  })
  sessions: any[];

  @Column({ default: true })
  isActive: boolean;

  @OneToOne(() => Profile, (profile) => profile.user)
  profile: Profile;

  @Column({type: 'text', nullable: true})
  verify_code: string;

  @Column({type: 'timestamp', nullable: true})
  exp_verify_at: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
