/**
 * server/db/client.ts — MySQL 连接池管理
 *
 * 使用 mysql2/promise 创建连接池，兼容 MySQL / TiDB / MariaDB / PlanetScale / RDS 等
 * MySQL 兼容数据库。
 */

import mysql, { type Pool, type PoolOptions } from 'mysql2/promise';
import { config } from '../config.js';

let pool: Pool | null = null;

/** 连接池默认配置 */
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

/**
 * 初始化连接池。应在应用启动时调用一次。
 * 可通过 options 覆盖默认配置（如 config.json 热切换场景）。
 */
export function initPool(options?: Partial<PoolOptions>): Pool {
  if (pool) {
    // 已存在则先关闭旧池
    pool.end().catch(() => {});
  }
  pool = mysql.createPool({ ...DEFAULT_POOL_OPTIONS, ...options });
  return pool;
}

/**
 * 获取当前连接池实例。
 * 若未初始化则自动使用默认配置创建。
 */
export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool(DEFAULT_POOL_OPTIONS);
  }
  return pool;
}

/**
 * 测试数据库连接是否正常。
 * 返回 `true` 表示连接成功，`false` 表示失败。
 */
export async function testConnection(): Promise<boolean> {
  try {
    const p = getPool();
    await p.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

/**
 * 优雅关闭连接池。应在应用关闭时调用。
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
