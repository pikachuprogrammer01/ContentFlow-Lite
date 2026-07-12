/**
 * server/scripts/migrate-role-enum.ts — ALTER TABLE 扩展 role ENUM
 *
 * 用法: cd server && npx tsx scripts/migrate-role-enum.ts
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env') });

const { getPool } = await import('../db/client.js');

const pool = getPool();
await pool.query(
  "ALTER TABLE users MODIFY role ENUM('super_admin','admin','user') NOT NULL DEFAULT 'user' COMMENT '角色权限'",
);
console.log('✅ role ENUM 已扩展为 super_admin, admin, user');
await pool.end();
process.exit(0);
