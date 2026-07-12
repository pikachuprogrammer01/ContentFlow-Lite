/**
 * server/db/repositories/generation-repo.ts — 生成记录仓库
 *
 * 职责：generation_records 表 CRUD，不含业务逻辑。
 * 每次 AI 生成后记录追踪信息。
 */

import { getPool } from '../client.js';
import type { GenerationRow } from '../../types.js';

/**
 * 记录一次生成。
 */
export async function record(params: {
  id: string;
  userId: string;
  contentId: string;
  topic: string;
  platform: string;
  promptId: string;
  promptVersion: string;
  model: string;
}): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO generation_records (id, user_id, content_id, topic, platform, prompt_id, prompt_version, model)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      params.id,
      params.userId,
      params.contentId,
      params.topic,
      params.platform,
      params.promptId,
      params.promptVersion,
      params.model,
    ],
  );
}

/**
 * 获取用户的生成记录列表。
 */
export async function listByUser(
  userId: string,
  limit = 20,
  offset = 0,
): Promise<GenerationRow[]> {
  const pool = getPool();
  const [rows] = await pool.query<import('mysql2/promise').RowDataPacket[]>(
    'SELECT * FROM generation_records WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [userId, limit, offset],
  );
  return rows as GenerationRow[];
}

/**
 * [ADMIN] 获取所有生成记录列表（跨用户，按创建时间倒序，分页）。
 */
export async function listAll(limit = 20, offset = 0): Promise<GenerationRow[]> {
  const pool = getPool();
  const [rows] = await pool.query<import('mysql2/promise').RowDataPacket[]>(
    'SELECT * FROM generation_records ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset],
  );
  return rows as GenerationRow[];
}

/**
 * [ADMIN] 统计生成记录总数。
 */
export async function countAll(): Promise<number> {
  const pool = getPool();
  const [rows] = await pool.query<import('mysql2/promise').RowDataPacket[]>(
    'SELECT COUNT(*) as cnt FROM generation_records',
  );
  return rows[0].cnt as number;
}

/**
 * [SUPER_ADMIN] 批量删除生成记录。
 */
export async function batchRemove(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const pool = getPool();
  const placeholders = ids.map(() => '?').join(',');
  await pool.query(`DELETE FROM generation_records WHERE id IN (${placeholders})`, ids);
}

/**
 * [SUPER_ADMIN] 清空全部生成记录。
 */
export async function clearAll(): Promise<void> {
  const pool = getPool();
  await pool.query('DELETE FROM generation_records');
}
