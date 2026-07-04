/**
 * server/db/repositories/content-repo.ts — 内容数据仓库
 *
 * 职责：contents 表 CRUD，不含业务逻辑。
 * JSON 字段的序列化/反序列化由本层负责。
 */

import { getPool } from '../client.js';
import type { Content, ContentRow } from '../../types.js';

/** 安全解析 JSON，失败时返回默认值 */
function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  try {
    return JSON.parse(value as string) as T;
  } catch {
    return fallback;
  }
}

/** 将 DB 行转换为 Content DTO */
function rowToContent(row: ContentRow): Content {
  return {
    id: row.id,
    topic: row.topic,
    platform: row.platform,
    titles: safeJsonParse(row.titles, []),
    cover: safeJsonParse(row.cover, { title: '', subtitle: '' }),
    pages: safeJsonParse(row.pages, []),
    tags: safeJsonParse(row.tags, []),
    summary: row.summary,
    extraRequirements: row.extra_requirements,
    metadata: safeJsonParse(row.metadata, { promptId: '', promptVersion: '', model: '', platform: '', createdAt: '', generator: '' }),
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

/**
 * [ADMIN] 获取所有内容列表（跨用户，按创建时间倒序，分页）。
 */
export async function listAll(limit = 20, offset = 0): Promise<(Content & { userId: string })[]> {
  const pool = getPool();
  const [rows] = await pool.query<import('mysql2/promise').RowDataPacket[]>(
    'SELECT * FROM contents ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset],
  );
  return rows.map((r) => {
    const c = rowToContent(r as unknown as ContentRow);
    return { ...c, userId: (r as any).user_id as string };
  });
}

/**
 * [ADMIN] 统计内容总数。
 */
export async function countAll(): Promise<number> {
  const pool = getPool();
  const [rows] = await pool.query<import('mysql2/promise').RowDataPacket[]>(
    'SELECT COUNT(*) as cnt FROM contents',
  );
  return rows[0].cnt as number;
}

/**
 * [SUPER_ADMIN] 批量删除内容。
 */
export async function batchRemove(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const pool = getPool();
  const placeholders = ids.map(() => '?').join(',');
  await pool.query(`DELETE FROM contents WHERE id IN (${placeholders})`, ids);
}
