import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Permission } from './permission.entity.js';

export type PermissionEffect = 'GRANT' | 'DENY';

@Entity({ name: 'user_permissions' })
export class UserPermission {
  @PrimaryColumn({ name: 'user_id', type: 'varchar', length: 36 })
  userId!: string;

  @PrimaryColumn({ name: 'permission_id', type: 'varchar', length: 36 })
  permissionId!: string;

  @Column({ type: 'enum', enum: ['GRANT', 'DENY'] })
  effect!: PermissionEffect;

  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @ManyToOne(() => Permission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id' })
  permission?: Permission;
}