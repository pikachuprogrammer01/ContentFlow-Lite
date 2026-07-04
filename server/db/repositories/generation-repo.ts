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
