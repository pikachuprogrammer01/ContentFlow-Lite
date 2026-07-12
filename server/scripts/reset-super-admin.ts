/**
 * server/scripts/reset-super-admin.ts — 清空超级管理员
 *
 * 用法: cd server && npx tsx scripts/reset-super-admin.ts
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env') });

const { getPool } = await import('../db/client.js');
const pool = getPool();
await pool.query("DELETE FROM users WHERE role = 'super_admin'");
console.log('✅ 超级管理员已清空，请重启服务');
await pool.end();
process.exit(0);
