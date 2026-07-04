/**
 * server/db/repositories/content-repo.ts — 内容数据仓库
 *
 * 职责：contents 表 CRUD，不含业务逻辑。
 * JSON 字段的序列化/反序列化由本层负责。
 */

import { getPool } from '../client.js';
import type { Content, ContentRow } from '../../types.js';

/** 将 DB 行转换为 Content DTO */
function rowToContent(row: ContentRow): Content {
  return {
    id: row.id,
    topic: row.topic,
    platform: row.platform,
    titles: JSON.parse(row.titles),
    cover: JSON.parse(row.cover),
    pages: JSON.parse(row.pages),
    tags: JSON.parse(row.tags),
    summary: row.summary,
    extraRequirements: row.extra_requirements,
    metadata: JSON.parse(row.metadata),
  };
}

/**
 * 保存 Content DTO。
 */
export async function save(userId: string, content: Content): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO contents (id, user_id, topic, platform, titles, cover, pages, tags, summary, extra_requirements, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       topic = VALUES(topic),
       platform = VALUES(platform),
       titles = VALUES(titles),
       cover = VALUES(cover),
       pages = VALUES(pages),
       tags = VALUES(tags),
       summary = VALUES(summary),
       extra_requirements = VALUES(extra_requirements),
       metadata = VALUES(metadata)`,
    [
      content.id,
      userId,
      content.topic,
      content.platform,
      JSON.stringify(content.titles),
      JSON.stringify(content.cover),
      JSON.stringify(content.pages),
      JSON.stringify(content.tags),
      content.summary || null,
      content.extraRequirements || null,
      JSON.stringify(content.metadata),
    ],
  );
}

/**
 * 根据 ID 获取内容。
 */
export async function findById(id: string): Promise<Content | null> {
  const pool = getPool();
  const [rows] = await pool.query<import('mysql2/promise').RowDataPacket[]>(
    'SELECT * FROM contents WHERE id = ?',
    [id],
  );
  if (!rows[0]) return null;
  return rowToContent(rows[0] as ContentRow);
}

/**
 * 获取指定用户的内容列表（按创建时间倒序）。
 */
export async function listByUser(userId: string, limit = 20, offset = 0): Promise<Content[]> {
  const pool = getPool();
  const [rows] = await pool.query<import('mysql2/promise').RowDataPacket[]>(
    'SELECT * FROM contents WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [userId, limit, offset],
  );
  return rows.map((r) => rowToContent(r as unknown as ContentRow));
}

/**
 * 删除内容。
 */
export async function remove(id: string): Promise<void> {
  const pool = getPool();
  await pool.query('DELETE FROM contents WHERE id = ?', [id]);
}
