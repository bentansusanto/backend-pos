import Hashids from 'hashids';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RolePermission } from './role_permission.entity';

@Entity('roles')
export class Role {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now());
    }
  }

  @Column()
  name: string;

  @Column()
  code: string;

  @Column()
  description: string;

  @Column()
  self_registered: boolean;

  @OneToMany(() => RolePermission, (rolePermission) => rolePermission.role, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    cascade: true,
  })
  rolePermissions: RolePermission[];

  @OneToMany('User', 'role', {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
