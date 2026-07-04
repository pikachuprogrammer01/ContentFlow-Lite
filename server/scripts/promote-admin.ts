/**
 * server/scripts/promote-admin.ts — 提升指定用户为管理员
 *
 * 用法: cd server && npx tsx scripts/promote-admin.ts <username>
 * 示例: cd server && npx tsx scripts/promote-admin.ts phase_gate_test
 */

import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const { getPool } = await import('../db/client.js');
const { createLogger } = await import('../utils/logger.js');

const log = createLogger('scripts/promote-admin');

const username = process.argv[2];
if (!username) {
  log.error('用法: npx tsx scripts/promote-admin.ts <username>');
  process.exit(1);
}

try {
  const pool = getPool();
  const [result] = await pool.query<import('mysql2/promise').ResultSetHeader>(
    'UPDATE users SET role = ? WHERE username = ?',
    ['admin', username],
  );

  if (result.affectedRows === 0) {
    log.error(`未找到用户: ${username}`);
  } else {
    log.info(`用户 ${username} 已提升为管理员`);
  }
  await pool.end();
} catch (err) {
  log.error('数据库连接失败', { error: String(err) });
  process.exit(1);
}

process.exit(0);
