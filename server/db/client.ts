/**
 * server/db/client.ts — 数据库连接管理（Phase 3 迁移期：mysql2 连接池 + TypeORM DataSource 并存）
 *
 * ⚠️ 迁移说明：本文件在旧 server/db/repositories/*.ts 全部替换为 TypeORM 之前，
 * 同时维护两套连接：
 *   一、mysql2 连接池（initPool/getPool/testConnection/closePool）—— 供尚未迁移的旧代码使用
 *   二、TypeORM DataSource（AppDataSource/initDataSource/...）—— 供权限系统 + 已迁移代码使用
 * 两套连接各自 connectionLimit: 10，数据库侧实际连接数上限是两者之和（合计 20）。
 * TiDB Cloud 等按连接数限流/计费的托管库要注意这一点。
 * 待旧 repo 全部迁移完成，删除本文件「一」的部分，只保留「二」。
 */

import mysql, { type Pool, type PoolOptions } from 'mysql2/promise';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from '../config.js';

import { Role } from '../entities/role.entity.js';
import { Permission } from '../entities/permission.entity.js';
import { RolePermission } from '../entities/role-permission.entity.js';
import { UserRole } from '../entities/user-role.entity.js';
import { UserPermission } from '../entities/user-permission.entity.js';
// ⚠️ 待补充：User / Content / PromptTemplate / PromptVersion / GenerationRecord /
// UserSetting / PublishRecord / AppLog 这 8 个 Entity 需要 server/db/schema.ts
// 核对真实字段类型后才能准确写出。创建后加到下面 import 和 entities 数组里。

// ════════════════════════════════════════════════════════════
// 一、mysql2 连接池（Phase 2 遗留，供未迁移的旧代码使用）
// ════════════════════════════════════════════════════════════

let pool: Pool | null = null;

const DEFAULT_POOL_OPTIONS: PoolOptions = {
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  ...(config.db.ssl
    ? { ssl: { rejectUnauthorized: false, minVersion: 'TLSv1.2' as const } }
    : {}),
};

export function initPool(options?: Partial<PoolOptions>): Pool {
  if (pool) {
    pool.end().catch(() => {});
  }
  pool = mysql.createPool({ ...DEFAULT_POOL_OPTIONS, ...options });
  return pool;
}

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool(DEFAULT_POOL_OPTIONS);
  }
  return pool;
}

export async function testConnection(): Promise<boolean> {
  try {
    const p = getPool();
    await p.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// ════════════════════════════════════════════════════════════
// 二、TypeORM DataSource（Phase 3 新增，供权限系统 + 已迁移代码使用）
// ════════════════════════════════════════════════════════════

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: config.db.host,
  port: config.db.port,
  username: config.db.user,
  password: config.db.password,
  database: config.db.database,
  ssl: config.db.ssl
    ? { rejectUnauthorized: false, minVersion: 'TLSv1.2' as const }
    : undefined,

  // synchronize: true 仅限本地/测试环境；生产上线前改 false + 手写迁移
  synchronize: true,
  logging: false,

  entities: [
    Role,
    Permission,
    RolePermission,
    UserRole,
    UserPermission,
    // User, Content, PromptTemplate, PromptVersion, GenerationRecord,
    // UserSetting, PublishRecord, AppLog ← 待创建后加入
  ],

  extra: {
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  },
});

export async function initDataSource(): Promise<DataSource> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  return AppDataSource;
}

export async function testDataSourceConnection(): Promise<boolean> {
  try {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    await AppDataSource.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export async function closeDataSource(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
}