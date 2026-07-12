# 用户角色管理 — 现有代码参考

> 本文档记录 Phase 2 已实现的用户角色管理全套代码。
> 当前方案基于 `users.role ENUM('super_admin','admin','user')` 的三级扁平角色模型。
> Phase 3 完整 RBAC 设计见 `docs/PHASE3_DESIGN.md`，尚未实施。

---

## 一、数据库层

### 1.1 建表 DDL

**文件**: `server/db/schema.ts` — `TABLE_SCHEMAS[0]`（users 表）

```sql
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(64)   PRIMARY KEY COMMENT '用户唯一 ID',
  username      VARCHAR(100)  NOT NULL UNIQUE COMMENT '用户名',
  email         VARCHAR(200)  NOT NULL UNIQUE COMMENT '邮箱',
  password_hash VARCHAR(255)  NOT NULL COMMENT 'bcrypt 哈希',
  role          ENUM('super_admin','admin','user') NOT NULL DEFAULT 'user' COMMENT '角色权限',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='用户表';
```

### 1.2 迁移脚本

**文件**: `server/scripts/migrate-role-enum.ts`

```ts
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
```

---

## 二、配置层

**文件**: `server/config.ts`（第 65–76 行）

```ts
admin: {
  email: process.env.ADMIN_EMAIL || '',
  passwordHash: process.env.ADMIN_PASSWORD_HASH || '',
  cookieSecret: process.env.ADMIN_COOKIE_SECRET || 'admin-cookie-secret-change-me',
  /** 管理员注册密钥。注册时传 adminKey 与此一致则获得 admin 角色 */
  setupKey: process.env.ADMIN_SETUP_KEY || 'admin-setup-key-change-me',
  /** 系统初始化时自动创建的超级管理员（唯一，不可通过注册创建） */
  superAdmin: {
    username: process.env.SUPER_ADMIN_USERNAME || 'superadmin',
    email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@contentflow.local',
  },
},
```

---

## 三、类型定义层

### 3.1 Shared 类型

**文件**: `shared/src/types/auth.ts`

```ts
/** JWT Token 载荷 */
export interface TokenPayload {
  userId: string;
  role: 'super_admin' | 'admin' | 'user';
}

/** 前端使用的用户信息（camelCase） */
export interface UserInfo {
  id: string;
  username: string;
  email: string;
  role: 'super_admin' | 'admin' | 'user';
  createdAt?: string;
}

/** users 表行（snake_case） */
export interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: 'super_admin' | 'admin' | 'user';
  created_at: string;
  updated_at: string;
}
```

### 3.2 Express Request 扩展

**文件**: `server/middleware/auth.ts`（第 15–23 行）

```ts
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: 'super_admin' | 'admin' | 'user';
      };
    }
  }
}
```

---

## 四、认证与授权中间件

**文件**: `server/middleware/auth.ts`

```ts
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { AuthError, ForbiddenError } from '../utils/errors.js';

/**
 * JWT 认证中间件。
 * 从 Authorization 头提取 Bearer Token，验证后注入 req.user。
 * 验证失败 throw AuthError（由全局 error-handler 处理）。
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw new AuthError('未登录，请先登录');
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, config.jwt.secret) as {
      userId: string;
      role: 'super_admin' | 'admin' | 'user';
    };
    req.user = payload;
    next();
  } catch {
    throw new AuthError('Token 已过期，请重新登录');
  }
}

/**
 * Admin 角色守卫中间件。
 * 必须在 authMiddleware 之后使用。
 * 仅允许 role=admin 或 super_admin 通过。
 */
export function adminGuard(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
    throw new ForbiddenError('需要管理员权限');
  }
  next();
}

/**
 * Super Admin 角色守卫中间件。
 * 必须在 authMiddleware 之后使用。
 * 仅允许 role=super_admin 通过。
 */
export function superAdminGuard(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'super_admin') {
    throw new ForbiddenError('需要超级管理员权限');
  }
  next();
}
```

---

## 五、数据仓库层

**文件**: `server/db/repositories/user-repo.ts`

```ts
import { getPool } from '../client.js';
import type { UserRow } from '../../types.js';

/** 根据用户名查找用户。 */
export async function findByUsername(username: string): Promise<UserRow | null> {
  const pool = getPool();
  const [rows] = await pool.query<import('mysql2/promise').RowDataPacket[]>(
    'SELECT * FROM users WHERE username = ?',
    [username],
  );
  return (rows[0] as UserRow) || null;
}

/** 根据邮箱查找用户。 */
export async function findByEmail(email: string): Promise<UserRow | null> {
  const pool = getPool();
  const [rows] = await pool.query<import('mysql2/promise').RowDataPacket[]>(
    'SELECT * FROM users WHERE email = ?',
    [email],
  );
  return (rows[0] as UserRow) || null;
}

/** 根据 ID 查找用户。 */
export async function findById(id: string): Promise<UserRow | null> {
  const pool = getPool();
  const [rows] = await pool.query<import('mysql2/promise').RowDataPacket[]>(
    'SELECT * FROM users WHERE id = ?',
    [id],
  );
  return (rows[0] as UserRow) || null;
}

/** 创建新用户。role 可选，默认 'user'。 */
export async function create(params: {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role?: 'super_admin' | 'admin' | 'user';
}): Promise<void> {
  const pool = getPool();
  await pool.query(
    'INSERT INTO users (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
    [params.id, params.username, params.email, params.passwordHash, params.role || 'user'],
  );
}

/** 更新用户密码。 */
export async function updatePassword(userId: string, newHash: string): Promise<void> {
  const pool = getPool();
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
}

/** 更新用户个人信息（用户名、邮箱）。不涉及角色。 */
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

/** 获取所有用户列表（管理员用）。不含 password_hash。 */
export async function listAll(): Promise<UserRow[]> {
  const pool = getPool();
  const [rows] = await pool.query<import('mysql2/promise').RowDataPacket[]>(
    'SELECT id, username, email, role, created_at, updated_at FROM users ORDER BY created_at DESC',
  );
  return rows as UserRow[];
}

/** 管理员更新用户信息。支持更新 role 字段。 */
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

/** 管理员删除用户。硬删除。 */
export async function adminDeleteUser(userId: string): Promise<void> {
  const pool = getPool();
  await pool.query('DELETE FROM users WHERE id = ?', [userId]);
}

/** 统计用户总数。注册时用于判断是否首个用户。 */
export async function countAll(): Promise<number> {
  const pool = getPool();
  const [rows] = await pool.query<import("mysql2/promise").RowDataPacket[]>(
    'SELECT COUNT(*) as cnt FROM users',
  );
  return rows[0].cnt as number;
}
```

---

## 六、API 路由层

### 6.1 Admin 路由聚合入口

**文件**: `server/routes/admin/index.ts`

```ts
import { Router } from 'express';
import { authMiddleware, adminGuard } from '../../middleware/auth.js';
import { mountUsers } from './users.js';
import { mountContents } from './contents.js';
import { mountGenerations } from './generations.js';
import { mountPrompts } from './prompts.js';

export function createAdminRouter(): Router {
  const router = Router();
  router.use(authMiddleware);   // ← 所有 /api/admin/* 需要认证
  router.use(adminGuard);       // ← 所有 /api/admin/* 需要 admin 或 super_admin

  mountUsers(router);
  mountContents(router);
  mountGenerations(router);
  mountPrompts(router);

  return router;
}
```

### 6.2 用户管理子路由

**文件**: `server/routes/admin/users.ts`

```ts
import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { resetPasswordLimiter } from '../../middleware/rate-limit.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import * as userRepo from '../../db/repositories/user-repo.js';
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from '../../utils/errors.js';
import { success } from '../../utils/response.js';
import { validatePassword, validateUsername, validateEmail } from '../../utils/validate.js';

const BCRYPT_COST = 12;

export function mountUsers(router: Router): void {
  // ── GET /users ──────────────────────────────────────
  // 权限: super_admin 看全部; admin 看不到 admin/super_admin 用户
  router.get('/users', asyncHandler(async (req: Request, res: Response) => {
    const users = await userRepo.listAll();
    const isSuper = req.user!.role === 'super_admin';

    res.json(success(
      users
        .filter((u) => isSuper || (u.role !== 'admin' && u.role !== 'super_admin'))
        .map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          role: u.role,
          createdAt: u.created_at,
          updatedAt: u.updated_at,
        })),
    ));
  }));

  // ── PUT /users/:id ──────────────────────────────────
  // 权限: ① 非 super_admin 不能操作 super_admin
  //       ② 非 super_admin 不能操作其他 admin
  //       ③ 只有 super_admin 可修改 role 字段
  router.put('/users/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { username, email, role } = req.body;
    const isSuper = req.user!.role === 'super_admin';

    const user = await userRepo.findById(id);
    if (!user) throw new NotFoundError('用户不存在');

    if (!isSuper && user.role === 'super_admin') {
      throw new ForbiddenError('无权操作超级管理员');
    }

    if (!isSuper && user.role === 'admin' && id !== req.user!.userId) {
      throw new ForbiddenError('无权操作其他管理员');
    }

    const fields: { username?: string; email?: string; role?: string } = {};
    if (username !== undefined) {
      const r = validateUsername(username);
      if (!r.valid) throw new ValidationError(r.errors[0].message);
      fields.username = r.values.username;
    }
    if (email !== undefined) {
      const r = validateEmail(email);
      if (!r.valid) throw new ValidationError(r.errors[0].message);
      fields.email = r.values.email;
    }
    if (role !== undefined && isSuper) fields.role = role;

    if (Object.keys(fields).length === 0) throw new ValidationError('无更新字段');

    await userRepo.adminUpdateUser(id, fields);
    res.json(success({ id, updated: true }));
  }));

  // ── DELETE /users/:id ───────────────────────────────
  // 权限: ① 不能删自己  ② 不能删 super_admin  ③ 非 super_admin 不能删 admin
  router.delete('/users/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const currentUserId = req.user!.userId;
    const isSuper = req.user!.role === 'super_admin';

    if (id === currentUserId) throw new ValidationError('不能删除自己的账户');

    const user = await userRepo.findById(id);
    if (!user) throw new NotFoundError('用户不存在');

    if (user.role === 'super_admin') throw new ForbiddenError('不能删除超级管理员');
    if (!isSuper && user.role === 'admin') throw new ForbiddenError('无权删除其他管理员');

    await userRepo.adminDeleteUser(id);
    res.json(success({ deleted: true }));
  }));

  // ── POST /users/:id/reset-password ──────────────────
  // 权限: 同 PUT 规则
  router.post('/users/:id/reset-password', resetPasswordLimiter, asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { newPassword } = req.body;
    const isSuper = req.user!.role === 'super_admin';

    if (!newPassword || typeof newPassword !== 'string') {
      throw new ValidationError('新密码不能为空');
    }

    const pwResult = validatePassword(newPassword);
    if (!pwResult.valid) throw new ValidationError(pwResult.errors[0].message);

    const user = await userRepo.findById(id);
    if (!user) throw new NotFoundError('用户不存在');

    if (!isSuper && user.role === 'super_admin') {
      throw new ForbiddenError('无权操作超级管理员');
    }

    if (!isSuper && user.role === 'admin' && id !== req.user!.userId) {
      throw new ForbiddenError('无权操作其他管理员');
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
    if (isSamePassword) throw new ConflictError('新密码与当前密码相同，密码未变更');

    const hash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await userRepo.updatePassword(id, hash);

    res.json(success({ reset: true }));
  }));
}
```

### 6.3 认证路由（角色相关片段）

**文件**: `server/routes/auth.ts`

```ts
import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { authMiddleware } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rate-limit.js';
import { asyncHandler } from '../middleware/error-handler.js';
import * as userRepo from '../db/repositories/user-repo.js';
import { createLogger } from '../utils/logger.js';
import {
  validateRegisterInput,
  validateLoginInput,
  validateProfileInput,
} from '../utils/validate.js';
import {
  ValidationError,
  ConflictError,
  AuthError,
  NotFoundError,
} from '../utils/errors.js';

const log = createLogger('routes/auth');
const BCRYPT_COST = 12;

/** 生成 access token（24 小时有效期），payload 含 userId + role */
function generateToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, config.jwt.secret, { expiresIn: '24h' });
}

export function createAuthRouter(): Router {
  const router = Router();

  // ── POST /api/auth/register ────────────────────────────
  router.post('/register', asyncHandler(async (req: Request, res: Response) => {
    const result = validateRegisterInput(req.body);
    if (!result.valid) {
      throw new ValidationError(result.errors[0].message, result.errors);
    }

    const { username, password, email, adminKey } = result.values;

    // 检查用户名/邮箱唯一性
    const existingUser = await userRepo.findByUsername(username);
    if (existingUser) throw new ConflictError('用户名已被注册');

    const existingEmail = await userRepo.findByEmail(email);
    if (existingEmail) throw new ConflictError('邮箱已被注册');

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    // ★ 角色分配逻辑 ★
    // adminKey 匹配 → admin   |   首个用户 → admin   |   其余 → user
    // super_admin 不可通过注册获得，只能由系统初始化创建
    const setupKey = config.admin.setupKey;
    const isAdmin = !!(adminKey && setupKey && adminKey === setupKey);
    const userCount = await userRepo.countAll();
    const role: 'super_admin' | 'admin' | 'user' =
      isAdmin || userCount === 0 ? 'admin' : 'user';

    const userId = randomUUID();
    await userRepo.create({ id: userId, username, email, passwordHash, role });

    const accessToken = generateToken(userId, role);

    log.info('用户注册成功', { username, role });

    res.status(201).json({
      user: { id: userId, username, email, role },
      accessToken,
    });
  }));

  // ── POST /api/auth/login ───────────────────────────────
  router.post('/login', loginLimiter, asyncHandler(async (req: Request, res: Response) => {
    const result = validateLoginInput(req.body);
    if (!result.valid) throw new ValidationError(result.errors[0].message, result.errors);

    const { username, password } = result.values;

    const user = await userRepo.findByUsername(username);
    if (!user) throw new AuthError('该用户不存在！');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new AuthError('用户名或密码错误');

    // role 写入 JWT payload
    const accessToken = generateToken(user.id, user.role);

    log.info('用户登录成功', { userId: user.id });

    res.json({
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
      accessToken,
    });
  }));

  // ── GET /api/auth/me ───────────────────────────────────
  router.get('/me', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const user = await userRepo.findById(userId);
    if (!user) throw new NotFoundError('用户不存在');

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.created_at,
      },
    });
  }));

  // ── PUT /api/auth/me ───────────────────────────────────
  router.put('/me', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const result = validateProfileInput(req.body);
    if (!result.valid) throw new ValidationError(result.errors[0].message, result.errors);

    const fields: { username?: string; email?: string } = {};
    if (result.values.username !== undefined) fields.username = result.values.username;
    if (result.values.email !== undefined) fields.email = result.values.email;

    await userRepo.updateProfile(userId, fields);

    const user = await userRepo.findById(userId);
    res.json({
      user: {
        id: user!.id,
        username: user!.username,
        email: user!.email,
        role: user!.role,
        createdAt: user!.created_at,
      },
    });
  }));

  return router;
}
```

### 6.4 其他 Admin 路由中的 superAdminGuard 使用

| 文件 | 路由 | 代码 |
|------|------|------|
| `server/routes/admin/contents.ts` | `POST /contents/batch-delete` | `router.post('/contents/batch-delete', superAdminGuard, asyncHandler(...))` |
| `server/routes/admin/generations.ts` | `POST /generation-records/batch-delete` | `router.post('/generation-records/batch-delete', superAdminGuard, asyncHandler(...))` |
| `server/routes/admin/generations.ts` | `POST /generation-records/clear` | `router.post('/generation-records/clear', superAdminGuard, asyncHandler(...))` |
| `server/routes/admin/prompts.ts` | `POST /prompt-templates/batch-delete` | `router.post('/prompt-templates/batch-delete', superAdminGuard, asyncHandler(...))` |

---

## 七、运维脚本

### 7.1 提升用户角色

**文件**: `server/scripts/promote-admin.ts`

```ts
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env') });

const { getPool } = await import('../db/client.js');
const { createLogger } = await import('../utils/logger.js');

const log = createLogger('scripts/promote-admin');

const username = process.argv[2];
const role = process.argv[3] || 'admin';
if (!username) {
  log.error('用法: npx tsx scripts/promote-admin.ts <username> [admin|super_admin]');
  process.exit(1);
}
if (role !== 'admin' && role !== 'super_admin') {
  log.error('角色必须是 admin 或 super_admin');
  process.exit(1);
}

try {
  const pool = getPool();
  const [result] = await pool.query<import('mysql2/promise').ResultSetHeader>(
    'UPDATE users SET role = ? WHERE username = ?',
    [role, username],
  );

  if (result.affectedRows === 0) {
    log.error(`未找到用户: ${username}`);
  } else {
    log.info(`用户 ${username} 已提升为 ${role === "super_admin" ? "超级管理员" : "管理员"}`);
  }
  await pool.end();
} catch (err) {
  log.error('数据库连接失败', { error: String(err) });
  process.exit(1);
}

process.exit(0);
```

用法: `cd server && npx tsx scripts/promote-admin.ts <username> [admin|super_admin]`

### 7.2 清空超级管理员

**文件**: `server/scripts/reset-super-admin.ts`

```ts
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
```

用法: `cd server && npx tsx scripts/reset-super-admin.ts`，清空后重启服务可重新创建。

---

## 八、服务启动时的超级管理员初始化

**文件**: `server/index.ts`（第 44–107 行）

```ts
// 确保超级管理员存在（系统唯一，首次启动交互式创建）
try {
  const { getPool } = await import('./db/client.js');
  const pool = getPool();

  const [rows] = await pool.query<import('mysql2/promise').RowDataPacket[]>(
    "SELECT id FROM users WHERE role = 'super_admin' LIMIT 1",
  );
  if (rows.length === 0) {
    const { default: cfg } = await import('./config.js');
    const bcrypt = await import('bcryptjs');
    const { randomUUID, randomBytes } = await import('node:crypto');
    const readline = await import('node:readline');

    // 生成随机安全密码（16 位）
    const randomPassword = randomBytes(12).toString('base64url');

    // 优先读取环境变量，避免 tsx watch 重启干扰交互式输入
    const envPassword = process.env.SUPER_ADMIN_PASSWORD?.trim();
    let answer: string;

    if (envPassword) {
      answer = envPassword;
      log.info('通过 SUPER_ADMIN_PASSWORD 环境变量设置密码');
    } else {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      answer = await new Promise((resolve) => {
        rl.question(
          '\n🔐 首次启动 — 创建超级管理员\n' +
          `   用户名: ${cfg.admin.superAdmin.username}\n` +
          '   💡 提示: 可设置 SUPER_ADMIN_PASSWORD 环境变量跳过交互输入\n' +
          '   请设置密码（直接回车使用随机密码）: ',
          (a) => {
            rl.close();
            resolve(a.trim() || randomPassword);
          },
        );
      });
    }

    const hash = await bcrypt.hash(answer, 12);
    const id = randomUUID();
    await pool.query(
      'INSERT INTO users (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [id, cfg.admin.superAdmin.username, cfg.admin.superAdmin.email, hash, 'super_admin'],
    );

    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║  🔑 超级管理员已创建 — 请务必妥善保管！          ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  用户名 : ${cfg.admin.superAdmin.username.padEnd(36)}║`);
    console.log(`║  密  码 : ${answer.padEnd(36)}║`);
    console.log('╠══════════════════════════════════════════════════╣');
    console.log('║  ⚠️  此密码仅显示一次，请立即复制保存！          ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');

    log.info('超级管理员已创建', { username: cfg.admin.superAdmin.username });
  } else {
    log.info('超级管理员已存在，跳过初始化');
  }
} catch (err) {
  log.error('超级管理员初始化失败', { error: String(err) });
}
```

---

## 九、前端层

### 9.1 Auth Store

**文件**: `client/src/stores/auth.ts`

```ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/utils/api-client';
import { storage } from '@/utils/storage';
import type { UserInfo } from '@/types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserInfo | null>(null);        // 含 role 字段
  const token = ref<string | null>(storage.get('accessToken'));
  const loading = ref(false);

  const isAuthenticated = computed(() => !!token.value && !!user.value);

  async function login(username: string, password: string): Promise<void> {
    const res = await api.post<{ user: UserInfo; accessToken: string }>(
      '/api/auth/login',
      { username, password },
    );
    token.value = res.accessToken;
    user.value = res.user;              // res.user 含 role
    storage.set('accessToken', res.accessToken);
  }

  async function register(
    username: string,
    password: string,
    email: string,
    adminKey?: string,                  // 可选，传 adminKey 可获取 admin 角色
  ): Promise<void> {
    const body: Record<string, string> = { username, password, email };
    if (adminKey) body.adminKey = adminKey;
    const res = await api.post<{ user: UserInfo; accessToken: string }>(
      '/api/auth/register',
      body,
    );
    token.value = res.accessToken;
    user.value = res.user;              // res.user 含 role
    storage.set('accessToken', res.accessToken);
  }

  async function fetchUser(): Promise<boolean> {
    if (!token.value) return false;
    loading.value = true;
    try {
      const res = await api.get<{ user: UserInfo }>('/api/auth/me');
      user.value = res.user;            // res.user 含 role
      return true;
    } catch {
      logout();
      return false;
    } finally {
      loading.value = false;
    }
  }

  function logout(): void {
    token.value = null;
    user.value = null;
    storage.remove('accessToken');
  }

  return { user, token, loading, isAuthenticated, login, register, fetchUser, logout };
});
```

### 9.2 路由守卫

**文件**: `client/src/router/index.ts`

```ts
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login',   name: 'login',   component: () => import('@/pages/LoginPage.vue'),   meta: { public: true } },
    { path: '/',        name: 'home',    component: () => import('@/pages/HomePage.vue') },
    { path: '/edit/:id?', name: 'edit',  component: () => import('@/pages/EditPage.vue') },
    { path: '/history', name: 'history', component: () => import('@/pages/HistoryPage.vue') },
    { path: '/prompt',  name: 'prompt',  component: () => import('@/pages/PromptPage.vue') },
    { path: '/profile', name: 'profile', component: () => import('@/pages/ProfilePage.vue') },
    { path: '/admin',   name: 'admin',   component: () => import('@/pages/AdminPage.vue'),   meta: { admin: true } },
  ],
});

// ★ 全局导航守卫 ★
router.beforeEach(async (to, _from, next) => {
  // 公开页面（登录页）直接放行
  if (to.meta.public) {
    next();
    return;
  }

  const auth = useAuthStore();

  // 已有 token 但未加载用户信息 → 先拉取
  if (auth.token && !auth.user) {
    const ok = await auth.fetchUser();
    if (ok) { next(); return; }
  }

  if (auth.isAuthenticated) {
    // 管理员页面：仅 admin/super_admin 可访问，否则跳首页
    if (to.meta.admin && auth.user?.role !== 'admin' && auth.user?.role !== 'super_admin') {
      next({ name: 'home' });
      return;
    }
    next();
  } else {
    next({ name: 'login', query: { redirect: to.fullPath } });
  }
});

export default router;
```

### 9.3 导航菜单 — 管理入口显隐

**文件**: `client/src/layouts/DefaultLayout.vue`（第 25–34 行）

```ts
const menuOptions = computed<MenuOption[]>(() => {
  const items: MenuOption[] = [
    { label: '生成', key: 'home' },
    { label: '历史', key: 'history' },
    { label: 'Prompt', key: 'prompt' },
  ];
  // ★ 仅 admin/super_admin 可见「管理」菜单项 ★
  if (auth.user?.role === 'admin' || auth.user?.role === 'super_admin') {
    items.push({ label: '管理', key: 'admin' });
  }
  return items;
});
```

### 9.4 用户管理界面

**文件**: `client/src/components/admin/UserTab.vue`

```ts
// ── 角色映射 ──────────────────────────────────────────
function roleLabel(role: string): string {
  const map: Record<string, string> = { super_admin: '超级管理员', admin: '管理员', user: '普通用户' };
  return map[role] || role;
}

function roleColor(role: string): string {
  if (role === 'super_admin') return 'color: #dc2626; font-weight: 700';
  if (role === 'admin') return 'color: #3b82f6; font-weight: 600';
  return '';
}

// ── 权限判断 ──────────────────────────────────────────
const isSuperAdmin = computed(() => auth.user?.role === 'super_admin');
const currentUserId = computed(() => auth.user?.id);

function isSelf(row: AdminUser): boolean {
  return row.id === currentUserId.value;
}

// super_admin 可编辑所有人; admin 只能编辑 user
function canEdit(row: AdminUser): boolean {
  if (isSuperAdmin.value) return true;
  return row.role === 'user';
}

// 不能删 super_admin; 不能删自己; 非 super_admin 不能删 admin
function canDelete(row: AdminUser): boolean {
  if (row.role === 'super_admin') return false;
  if (row.id === currentUserId.value) return false;
  if (row.role === 'admin' && !isSuperAdmin.value) return false;
  return true;
}

// ── 角色下拉框 ────────────────────────────────────────
// 编辑自己时角色不可改（防止降级自己）
const roleEditable = computed(() => {
  if (!editingUser.value) return true;
  return editingUser.value.id !== currentUserId.value;
});

// super_admin 可选 admin/user; admin 只有 user
const roleOptions = computed(() => {
  const opts: { label: string; value: string }[] = [];
  if (isSuperAdmin.value) {
    opts.push({ label: '管理员', value: 'admin' });
  }
  opts.push({ label: '普通用户', value: 'user' });
  return opts;
});

// ── 保存编辑 ──────────────────────────────────────────
async function saveEdit(): Promise<void> {
  // ...
  const body: Record<string, string> = {
    username: editUsername.value,
    email: editEmail.value,
  };
  // ★ 仅 isSuperAdmin 且非编辑自己时可传 role ★
  if (isSuperAdmin.value && roleEditable.value) {
    body.role = editRole.value;
  }
  await api.put(`/api/admin/users/${editingUser.value.id}`, body);
  // ...
}
```

模板中角色下拉框的渲染（仅 super_admin 可见）：

```html
<NFormItem v-if="isSuperAdmin" label="角色">
  <NSelect
    v-model:value="editRole"
    :options="roleOptions"
    :disabled="!roleEditable"
    :placeholder="roleEditable ? '请选择角色' : '不可更改自己的角色'"
  />
  <span v-if="!roleEditable" style="font-size: 12px; color: #999; margin-top: 4px">
    禁止编辑角色
  </span>
</NFormItem>
```

### 9.5 个人信息页 — 角色中文显示

**文件**: `client/src/pages/ProfilePage.vue`（第 37–44 行）

```ts
function roleLabel(role: string): string {
  const map: Record<string, string> = {
    super_admin: '超级管理员',
    admin: '管理员',
    user: '普通用户',
  };
  return map[role] || role;
}
```

### 9.6 其他 Admin Tab 中的 isSuperAdmin 使用

三个管理 Tab 均通过 computed 判断 `isSuperAdmin` 来控制批量删除等敏感操作按钮的显隐：

```ts
// ContentTab.vue / GenerationTab.vue / PromptTemplateTab.vue 中均有:
const isSuperAdmin = computed(() => auth.user?.role === 'super_admin');
```

| 文件 | 控制内容 |
|------|---------|
| `client/src/components/admin/ContentTab.vue` | 批量删除按钮、类型列 |
| `client/src/components/admin/GenerationTab.vue` | 操作按钮列 |
| `client/src/components/admin/PromptTemplateTab.vue` | 批量删除按钮 |

---

## 十、现有方案的已知限制

（来自 `docs/ARCHITECTURE_DRILL.md` 和 `docs/PHASE3_DESIGN.md`）

1. **JWT 内嵌 role** — 角色变更后旧 token 仍然有效直到过期，无法即时撤销
2. **权限硬编码** — `adminGuard`/`superAdminGuard` 只支持两种固定判断，无权限码体系
3. **无数据范围控制** — 无法表达「只能管理自己创建的数据」
4. **无法自定义角色** — 三级 ENUM 固定，无法新增粒度更细的角色
5. **Phase 3 完整 RBAC 设计**（`docs/PHASE3_DESIGN.md`）规划了 `roles`/`user_roles`/`permissions`/`role_permissions`/`user_permissions` 五表 + `permissionGuard(code)` + JWT 去 role + Redis 缓存，**但尚未实施**
