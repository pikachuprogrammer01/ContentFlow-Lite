/**
 * server/middleware/auth.ts — JWT 认证中间件
 *
 * 验证 Authorization: Bearer <token> 中的 JWT Token。
 * 通过后将用户信息注入 req.user。
 * 错误通过 throw AppError 子类抛出，由全局 error-handler 捕获。
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { AuthError, ForbiddenError } from '../utils/errors.js';

/** 扩展 Express Request，注入经过认证的用户信息 */
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
