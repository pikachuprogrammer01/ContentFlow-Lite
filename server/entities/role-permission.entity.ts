import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Role } from './role.entity.js';
import { Permission } from './permission.entity.js';

export type DataScope = 'ALL' | 'SELF';

@Entity({ name: 'role_permissions' })
export class RolePermission {
  @PrimaryColumn({ name: 'role_id', type: 'varchar', length: 36 })
  roleId!: string;

  @PrimaryColumn({ name: 'permission_id', type: 'varchar', length: 36 })
  permissionId!: string;

  @Column({ name: 'data_scope', type: 'enum', enum: ['ALL', 'SELF'], default: 'SELF' })
  dataScope!: DataScope;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role?: Role;

  @ManyToOne(() => Permission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id' })
  permission?: Permission;
}