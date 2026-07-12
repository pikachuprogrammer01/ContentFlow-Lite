/**
 * server/services/permission-service.ts — 权限计算 + 守卫中间件 + 角色/权限写操作
 *
 * 对应 PHASE3_DESIGN.md §3.3。
 *   - getEffectivePermissions：角色权限 ∪ 用户覆盖 = 最终有效权限（含 data_scope）
 *   - permissionGuard：Express 中间件，替代旧的 adminGuard / superAdminGuard
 *   - assertCanManageUser：level 层级校验
 *   - removeUserRole / assignUserRole / grantUserPermission：写操作，均含主动失效缓存
 *
 * 缓存：Redis 已配置且连接成功 → 用 Redis；否则静默降级为进程内 Map（§3.3）。
 * ioredis 是可选依赖：未安装时不影响本文件编译，运行时自动走内存缓存
 * （用 node:module 的 createRequire 而非静态 import，避免把 ioredis 变成编译期硬依赖；
 *  想启用 Redis 时 `pnpm add ioredis` 即可，不用改这个文件）。
 */

import { createRequire } from "node:module";
import type { Request, Response, NextFunction } from "express";
import type { EntityManager } from "typeorm";
import { AppDataSource } from "../db/client.js";
import { Role } from "../entities/role.entity.js";
import { UserRole } from "../entities/user-role.entity.js";
import { RolePermission } from "../entities/role-permission.entity.js";
import { UserPermission } from "../entities/user-permission.entity.js";
import { Permission } from "../entities/permission.entity.js";
import { AuthError, ForbiddenError } from "../utils/errors.js";

// 复用 utils/errors.ts 已有的 ForbiddenError（adminGuard/superAdminGuard 用的就是它），
// 不在这里重新定义同名类。只是重新导出，方便 verify-*.ts 统一从本文件 import。
export { ForbiddenError };

const require = createRequire(import.meta.url);

// ════════════════════════════════════════════════════════════
// 类型
// ════════════════════════════════════════════════════════════

export type DataScope = "ALL" | "SELF";
export type EffectivePermissions = Map<string, DataScope>;
export type PermissionEffect = "GRANT" | "DENY";

declare global {
  namespace Express {
    interface Request {
      dataScope?: DataScope;
    }
  }
}

// ════════════════════════════════════════════════════════════
// 缓存层：Redis 优先，静默降级内存
// ════════════════════════════════════════════════════════════

interface PermissionCache {
  get(key: string): Promise<EffectivePermissions | null>;
  set(
    key: string,
    value: EffectivePermissions,
    ttlSeconds: number,
  ): Promise<void>;
  delete(key: string): Promise<void>;
}

class MemoryPermissionCache implements PermissionCache {
  private store = new Map<
    string,
    { value: EffectivePermissions; expiresAt: number }
  >();

  async get(key: string): Promise<EffectivePermissions | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(
    key: string,
    value: EffectivePermissions,
    ttlSeconds: number,
  ): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

class RedisPermissionCache implements PermissionCache {
  private client: any;

  constructor(client: any) {
    this.client = client;
  }

  async get(key: string): Promise<EffectivePermissions | null> {
    const raw = await this.client.get(key);
    if (!raw) return null;
    const entries: [string, DataScope][] = JSON.parse(raw);
    return new Map(entries);
  }

  async set(
    key: string,
    value: EffectivePermissions,
    ttlSeconds: number,
  ): Promise<void> {
    await this.client.set(
      key,
      JSON.stringify([...value.entries()]),
      "EX",
      ttlSeconds,
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }
}

let cacheInstance: PermissionCache | null = null;

async function getCache(): Promise<PermissionCache> {
  if (cacheInstance) return cacheInstance;

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const Redis = require("ioredis");
      const client = new Redis(redisUrl, {
        lazyConnect: true,
        retryStrategy: () => null,
      });
      await client.connect();
      cacheInstance = new RedisPermissionCache(client);
      return cacheInstance;
    } catch {
      // ioredis 未安装，或连接失败——静默降级，不打印告警栈（§3.3 "无控制台交互"）
    }
  }

  cacheInstance = new MemoryPermissionCache();
  return cacheInstance;
}

/** 仅供测试脚本重置缓存单例，业务代码不要调用 */
export function __resetCacheForTests(): void {
  cacheInstance = null;
}

async function invalidateUserCache(userId: string): Promise<void> {
  const cache = await getCache();
  await cache.delete(`perm:${userId}`);
}

// ════════════════════════════════════════════════════════════
// 核心：有效权限计算
// ════════════════════════════════════════════════════════════

const CACHE_TTL_SECONDS = 120;

export async function getEffectivePermissions(
  userId: string,
): Promise<EffectivePermissions> {
  const cache = await getCache();
  const cached = await cache.get(`perm:${userId}`);
  if (cached) return cached;

  const manager = AppDataSource.manager;
  const effective: EffectivePermissions = new Map();

  const userRoles = await manager.find(UserRole, { where: { userId } });
  const roleIds = userRoles.map((ur) => ur.roleId);

  if (roleIds.length > 0) {
    const rolePerms = await manager
      .createQueryBuilder(RolePermission, "rp")
      .innerJoin("rp.permission", "permission")
      .where("rp.role_id IN (:...roleIds)", { roleIds })
      .andWhere("permission.status = :status", { status: true })
      .select("rp.data_scope", "dataScope")
      .addSelect("permission.code", "code")
      .getRawMany<{ dataScope: DataScope; code: string }>();

    // 多角色取并集，同一 code 取更宽的 scope（ALL 比 SELF 宽）
    for (const p of rolePerms) {
      const cur = effective.get(p.code);
      if (!cur || (cur === "SELF" && p.dataScope === "ALL")) {
        effective.set(p.code, p.dataScope);
      }
    }
  }

  const overrides = await manager
    .createQueryBuilder(UserPermission, "up")
    .innerJoin("up.permission", "permission")
    .where("up.user_id = :userId", { userId })
    .select("up.effect", "effect")
    .addSelect("up.expires_at", "expiresAt")
    .addSelect("permission.code", "code")
    .getRawMany<{
      effect: PermissionEffect;
      expiresAt: Date | null;
      code: string;
    }>();

  // 用户覆盖：DENY 摘除，GRANT 补上；已过期的覆盖视为不存在
  for (const o of overrides) {
    if (o.expiresAt && new Date(o.expiresAt) < new Date()) continue;
    if (o.effect === "DENY") effective.delete(o.code);
    if (o.effect === "GRANT")
      effective.set(o.code, effective.get(o.code) ?? "ALL");
  }

  await cache.set(`perm:${userId}`, effective, CACHE_TTL_SECONDS);
  return effective;
}

// ════════════════════════════════════════════════════════════
// Express 中间件：替代 adminGuard / superAdminGuard
// ════════════════════════════════════════════════════════════

/**
 * 依赖 Express 5 原生的 async 错误转发（返回的 rejected promise 会自动
 * forward 给 next(err)），所以这里直接 throw，不需要额外的 asyncHandler 包裹，
 * 跟 PHASE3_DESIGN.md §3.3 路由示例里 `permissionGuard('content:list')` 裸用的写法一致。
 */
export function permissionGuard(code: string) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (!req.user) {
      throw new AuthError("未登录，请先登录");
    }
    const scope = (await getEffectivePermissions(req.user.userId)).get(code);
    if (!scope) {
      throw new ForbiddenError(`缺少权限: ${code}`);
    }
    req.dataScope = scope;
    next();
  };
}

// ════════════════════════════════════════════════════════════
// 层级校验
// ════════════════════════════════════════════════════════════

async function getMaxRoleLevel(userId: string): Promise<number> {
  const result = await AppDataSource.manager
    .createQueryBuilder(UserRole, "ur")
    .innerJoin("ur.role", "role")
    .where("ur.user_id = :userId", { userId })
    .select("MAX(role.level)", "maxLevel")
    .getRawOne<{ maxLevel: string | null }>();

  return result?.maxLevel != null ? Number(result.maxLevel) : 0;
}

export async function assertCanManageUser(
  actorId: string,
  targetUserId: string,
): Promise<void> {
  const actorLevel = await getMaxRoleLevel(actorId);
  const targetLevel = await getMaxRoleLevel(targetUserId);
  if (actorLevel <= targetLevel) {
    throw new ForbiddenError("不能操作同级或更高层级的用户");
  }
}

// ════════════════════════════════════════════════════════════
// 写操作：角色分配 / 移除、用户级权限覆盖（均含主动失效缓存）
// ════════════════════════════════════════════════════════════

/**
 * 移除用户的角色分配。super_admin 有唯一性保护：系统内该角色仅剩 1 个
 * 分配时拒绝移除。
 *
 * 第 4 个参数 manager 为测试预留：正常业务调用不传，走全局连接；
 * verify-super-admin-guard.ts 这类破坏性测试会传入一个事务专用 manager，
 * 测完整体回滚，不影响真实数据。
 */
export async function removeUserRole(
  actorId: string,
  userId: string,
  roleId: string,
  manager: EntityManager = AppDataSource.manager,
): Promise<void> {
  const role = await manager.findOneBy(Role, { id: roleId });
  if (!role) throw new ForbiddenError("角色不存在");

  if (role.code === "super_admin") {
    const remaining = await manager.count(UserRole, { where: { roleId } });
    if (remaining <= 1)
      throw new ForbiddenError("不能移除系统内最后一个 super_admin");
  }

  await assertCanManageUser(actorId, userId);
  await manager.delete(UserRole, { userId, roleId });
  await invalidateUserCache(userId);
}

/**
 * 赋予用户一个角色。与 removeUserRole 对称，同样过层级校验、同样支持
 * manager 注入以便测试事务包裹。此前设计只展示了移除，没有展示这个对称
 * 操作——AdminJS 面板"给用户加角色"这类场景需要它。
 */
export async function assignUserRole(
  actorId: string,
  targetUserId: string,
  roleId: string,
  manager: EntityManager = AppDataSource.manager,
): Promise<void> {
  await assertCanManageUser(actorId, targetUserId);

  const existing = await manager.findOneBy(UserRole, {
    userId: targetUserId,
    roleId,
  });
  if (existing) return; // 幂等：已拥有则直接返回

  await manager.save(UserRole, { userId: targetUserId, roleId });
  await invalidateUserCache(targetUserId);
}

/**
 * 写入一条用户级权限覆盖（GRANT 或 DENY）。
 * GRANT 要求 actor 自己拥有该权限码（不能分发自己都没有的权限）；
 * DENY 不受此限制（层级更高的人应该能禁用下级的任意权限，即使自己也没有）。
 *
 * expiresAt 支持临时授权，对应 user_permissions.expires_at 的设计意图。
 */
export async function grantUserPermission(
  actorId: string,
  targetUserId: string,
  code: string,
  effect: PermissionEffect,
  expiresAt?: Date,
): Promise<void> {
  await assertCanManageUser(actorId, targetUserId);

  if (effect === "GRANT") {
    const actorPerms = await getEffectivePermissions(actorId);
    if (!actorPerms.has(code)) {
      throw new ForbiddenError("不能分发自己都没有的权限");
    }
  }

  const manager = AppDataSource.manager;
  const permission = await manager.findOneBy(Permission, { code });
  if (!permission) throw new ForbiddenError(`权限码不存在: ${code}`);

  const existing = await manager.findOneBy(UserPermission, {
    userId: targetUserId,
    permissionId: permission.id,
  });

  if (existing) {
    existing.effect = effect;
    existing.expiresAt = expiresAt ?? null;
    existing.createdBy = actorId;
    await manager.save(existing);
  } else {
    await manager.save(UserPermission, {
      userId: targetUserId,
      permissionId: permission.id,
      effect,
      expiresAt: expiresAt ?? null,
      createdBy: actorId,
    });
  }

  await invalidateUserCache(targetUserId);
}
