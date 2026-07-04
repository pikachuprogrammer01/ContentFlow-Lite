/**
 * server/middleware/auth.ts — JWT 认证中间件
 *
 * 验证 Authorization: Bearer <token> 中的 JWT Token。
 * 通过后将用户信息注入 req.user。
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

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
 * 验证失败返回 401。
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: '未登录，请先登录' },
    });
    return;
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
    res.status(401).json({
      error: { code: 'TOKEN_EXPIRED', message: 'Token 已过期，请重新登录' },
    });
  }
}

/**
 * Admin 角色守卫中间件。
 * 必须在 authMiddleware 之后使用。
 * 仅允许 role=admin 通过。
 */
export function adminGuard(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: '需要管理员权限' },
    });
    return;
  }
  next();
}
