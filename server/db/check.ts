/**
 * server/db/check.ts — DB 连接测试脚本
 *
 * 用于 phase-gate.sh 验证数据库连接。
 * 独立于 Express 服务器运行，exit 0 = 成功，exit 1 = 失败。
 */

import '../env.js';
import mysql from 'mysql2/promise';
import { config } from '../config.js';

try {
  const pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    ssl: config.db.ssl
      ? { rejectUnauthorized: false, minVersion: 'TLSv1.2' as const }
      : undefined,
    connectTimeout: 10000,
  });

  await pool.query('SELECT 1');
  await pool.end();
  process.exit(0);
} catch {
  process.exit(1);
}
