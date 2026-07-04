/**
 * server/db/repositories/prompt-repo.ts — Prompt 数据仓库
 *
 * 职责：prompt_templates / prompt_versions 表 CRUD，不含业务逻辑。
 */

import { getPool } from '../client.js';
import type { PromptTemplateRow, FinalPrompt } from '../../types.js';

/**
 * 获取用户的所有 Prompt 模板列表。
 */
export async function listTemplates(userId: string): Promise<PromptTemplateRow[]> {
  const pool = getPool();
  const [rows] = await pool.query<import('mysql2/promise').RowDataPacket[]>(
    'SELECT * FROM prompt_templates WHERE user_id = ? ORDER BY updated_at DESC',
    [userId],
  );
  return rows as PromptTemplateRow[];
}

/**
 * 创建新模板。
 */
export async function createTemplate(template: PromptTemplateRow): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO prompt_templates (id, user_id, name, type, is_default, platform, system_prompt, user_prompt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      template.id,
      template.user_id,
      template.name,
      template.type,
      template.is_default,
      template.platform,
      template.system_prompt,
      template.user_prompt,
    ],
  );
}

/**
 * 更新模板字段。
 */
export async function updateTemplate(
  id: string,
  fields: Partial<Pick<PromptTemplateRow, 'name' | 'system_prompt' | 'user_prompt' | 'is_default' | 'platform'>>,
): Promise<void> {
  const pool = getPool();
  const sets: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(fields)) {
    sets.push(`${key} = ?`);
    values.push(value);
  }

  if (sets.length === 0) return;

  await pool.query(
    `UPDATE prompt_templates SET ${sets.join(', ')} WHERE id = ?`,
    [...values, id],
  );
}

/**
 * 删除模板。
 */
export async function deleteTemplate(id: string): Promise<void> {
  const pool = getPool();
  // 先删版本，再删模板
  await pool.query('DELETE FROM prompt_versions WHERE prompt_id = ?', [id]);
  await pool.query('DELETE FROM prompt_templates WHERE id = ?', [id]);
}

/**
 * 获取模板的所有版本列表。
 */
export async function listVersions(promptId: string): Promise<import('mysql2/promise').RowDataPacket[]> {
  const pool = getPool();
  const [rows] = await pool.query<import('mysql2/promise').RowDataPacket[]>(
    'SELECT * FROM prompt_versions WHERE prompt_id = ? ORDER BY created_at DESC',
    [promptId],
  );
  return rows;
}

/**
 * 获取用户对某平台的默认 Prompt 模板。
 */
export async function findDefaultTextPrompt(userId: string, platform: string): Promise<PromptTemplateRow | null> {
  const pool = getPool();
  const [rows] = await pool.query<import('mysql2/promise').RowDataPacket[]>(
    `SELECT * FROM prompt_templates
     WHERE user_id = ? AND platform = ? AND type = 'text' AND is_default = 1
     LIMIT 1`,
    [userId, platform],
  );
  return (rows[0] as PromptTemplateRow) || null;
}

/**
 * 根据 ID 查找模板。
 */
export async function findTemplateById(id: string): Promise<PromptTemplateRow | null> {
  const pool = getPool();
  const [rows] = await pool.query<import('mysql2/promise').RowDataPacket[]>(
    'SELECT * FROM prompt_templates WHERE id = ?',
    [id],
  );
  return (rows[0] as PromptTemplateRow) || null;
}

/**
 * 获取模板的最新版本号。
 */
export async function getLatestVersion(promptId: string): Promise<string | null> {
  const pool = getPool();
  const [rows] = await pool.query<import('mysql2/promise').RowDataPacket[]>(
    `SELECT version FROM prompt_versions
     WHERE prompt_id = ? ORDER BY created_at DESC LIMIT 1`,
    [promptId],
  );
  return rows[0]?.version || null;
}

/**
 * 创建新版本（快照 PromptTemplate 完整内容）。
 */
export async function createVersion(
  id: string,
  promptId: string,
  version: string,
  content: Record<string, unknown>,
): Promise<void> {
  const pool = getPool();
  await pool.query(
    'INSERT INTO prompt_versions (id, prompt_id, version, content) VALUES (?, ?, ?, ?)',
    [id, promptId, version, JSON.stringify(content)],
  );
}

/**
 * 根据模板信息构建 FinalPrompt。
 * 替换 user_prompt 中的 {{变量}}。
 */
export function buildFinalPrompt(
  template: PromptTemplateRow,
  variables: Record<string, string>,
): FinalPrompt {
  let userPrompt = template.user_prompt;
  for (const [key, value] of Object.entries(variables)) {
    userPrompt = userPrompt.replaceAll(`{{${key}}}`, value);
  }
  return {
    systemPrompt: template.system_prompt,
    userPrompt,
  };
}

// ── [ADMIN] 跨用户查询 ─────────────────────────────────

/**
 * [ADMIN] 获取所有 Prompt 模板列表（跨用户，分页）。
 */
export async function listAllTemplates(limit = 20, offset = 0): Promise<PromptTemplateRow[]> {
  const pool = getPool();
  const [rows] = await pool.query<import('mysql2/promise').RowDataPacket[]>(
    'SELECT * FROM prompt_templates ORDER BY updated_at DESC LIMIT ? OFFSET ?',
    [limit, offset],
  );
  return rows as PromptTemplateRow[];
}

/**
 * [ADMIN] 统计 Prompt 模板总数。
 */
export async function countAllTemplates(): Promise<number> {
  const pool = getPool();
  const [rows] = await pool.query<import('mysql2/promise').RowDataPacket[]>(
    'SELECT COUNT(*) as cnt FROM prompt_templates',
  );
  return rows[0].cnt as number;
}

/**
 * [ADMIN] 获取所有 Prompt 版本列表（跨模板，分页）。
 */
export async function listAllVersions(limit = 20, offset = 0): Promise<import('mysql2/promise').RowDataPacket[]> {
  const pool = getPool();
  const [rows] = await pool.query<import('mysql2/promise').RowDataPacket[]>(
    'SELECT pv.*, pt.name as template_name, pt.platform FROM prompt_versions pv LEFT JOIN prompt_templates pt ON pv.prompt_id = pt.id ORDER BY pv.created_at DESC LIMIT ? OFFSET ?',
    [limit, offset],
  );
  return rows;
}

/**
 * [ADMIN] 统计 Prompt 版本总数。
 */
export async function countAllVersions(): Promise<number> {
  const pool = getPool();
  const [rows] = await pool.query<import('mysql2/promise').RowDataPacket[]>(
    'SELECT COUNT(*) as cnt FROM prompt_versions',
  );
  return rows[0].cnt as number;
}

/**
 * [SUPER_ADMIN] 批量删除 Prompt 模板（级联删除版本快照）。
 */
export async function batchDeleteTemplates(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const pool = getPool();
  const placeholders = ids.map(() => '?').join(',');
  await pool.query(`DELETE FROM prompt_versions WHERE prompt_id IN (${placeholders})`, ids);
  await pool.query(`DELETE FROM prompt_templates WHERE id IN (${placeholders})`, ids);
}
