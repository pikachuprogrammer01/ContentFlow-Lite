/**
 * server/db/repositories/user-repo.ts — 用户数据仓库
 *
 * 职责：users 表 CRUD，不含业务逻辑。
 * 所有用户数据操作必须通过本模块。
 */

import { getPool } from '../client.js';
import type { UserRow } from '../../types.js';

/**
 * 根据用户名查找用户。
 */
export async function findByUsername(username: string): Promise<UserRow | null> {
  const pool = getPool();
  const [rows] = await pool.query<import('mysql2/promise').RowDataPacket[]>(
    'SELECT * FROM users WHERE username = ?',
    [username],
  );
  return (rows[0] as UserRow) || null;
}

/**
 * 根据邮箱查找用户。
 */
export async function findByEmail(email: string): Promise<UserRow | null> {
  const pool = getPool();
  const [rows] = await pool.query<import('mysql2/promise').RowDataPacket[]>(
    'SELECT * FROM users WHERE email = ?',
    [email],
  );
  return (rows[0] as UserRow) || null;
}

/**
 * 根据 ID 查找用户。
 */
export async function findById(id: string): Promise<UserRow | null> {
  const pool = getPool();
  const [rows] = await pool.query<import('mysql2/promise').RowDataPacket[]>(
    'SELECT * FROM users WHERE id = ?',
    [id],
  );
  return (rows[0] as UserRow) || null;
}

/**
 * 创建新用户。
 */
export async function create(params: {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role?: 'admin' | 'user';
}): Promise<void> {
  const pool = getPool();
  await pool.query(
    'INSERT INTO users (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
    [params.id, params.username, params.email, params.passwordHash, params.role || 'user'],
  );
}

/**
 * 更新用户密码。
 */
export async function updatePassword(userId: string, newHash: string): Promise<void> {
  const pool = getPool();
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
}

/**
 * 更新用户个人信息（用户名、邮箱）。
 */
export async function updateProfile(
  userId: string,
  fields: { username?: string; email?: string },
): Promise<void> {
  const pool = getPool();
  const sets: string[] = [];
  const values: unknown[] = [];
  if (fields.username !== undefined) { sets.push('username = ?'); values.push(fields.username); }
  if (fields.email !== undefined) { sets.push('email = ?'); values.push(fields.email); }
  if (sets.length === 0) return;
  await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, [...values, userId]);
}

/**
 * 获取所有用户列表（管理员用）。
 */
export async function listAll(): Promise<UserRow[]> {
  const pool = getPool();
  const [rows] = await pool.query<import('mysql2/promise').RowDataPacket[]>(
    'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC',
  );
  return rows as UserRow[];
}

/**
 * 管理员更新用户信息。
 */
export async function adminUpdateUser(
  userId: string,
  fields: { username?: string; email?: string; role?: string },
): Promise<void> {
  const pool = getPool();
  const sets: string[] = [];
  const values: unknown[] = [];
  if (fields.username !== undefined) { sets.push('username = ?'); values.push(fields.username); }
  if (fields.email !== undefined) { sets.push('email = ?'); values.push(fields.email); }
  if (fields.role !== undefined) { sets.push('role = ?'); values.push(fields.role); }
  if (sets.length === 0) return;
  await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, [...values, userId]);
}

/**
 * 管理员删除用户。
 */
export async function adminDeleteUser(userId: string): Promise<void> {
  const pool = getPool();
  await pool.query('DELETE FROM users WHERE id = ?', [userId]);
}

/**
 * 统计用户总数。
 */
export async function countAll(): Promise<number> {
  const pool = getPool();
  const [rows] = await pool.query<import("mysql2/promise").RowDataPacket[]>(
    'SELECT COUNT(*) as cnt FROM users',
  );
  return rows[0].cnt as number;
}
