/**
 * server/middleware/rate-limit.ts — 限流中间件
 *
 * 登录：5 次/分钟/IP
 * 生成：10 次/分钟/用户
 * 重置密码：3 次/分钟/管理员用户
 *
 * 限流响应使用 fail() 统一信封，与全局 error handler 格式一致。
 */

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { fail } from '../utils/response.js';
import { ErrorCode } from '../utils/errors.js';

/**
 * 登录限流：5 次/分钟/IP。
 * 防止暴力破解。
 */
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json(fail(ErrorCode.RATE_LIMITED, '登录过于频繁，请 1 分钟后再试'));
  },
});

/**
 * AI 生成限流：10 次/分钟/用户。
 * 防止 AI 调用成本失控。
 *
 * 注意：必须在 authMiddleware 之后使用，否则使用 IP 作为 fallback。
 */
export const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request, _res: Response): string => {
    return req.user?.userId || ipKeyGenerator(req.ip ?? '', 56);
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json(fail(ErrorCode.RATE_LIMITED, '生成请求过于频繁，请 1 分钟后再试'));
  },
});

/**
 * 管理员重置密码限流：3 次/分钟/管理员用户。
 * 防止管理员账号被盗用后批量重置密码。
 *
 * 注意：必须在 authMiddleware 之后使用。
 */
export const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request, _res: Response): string => {
    return req.user?.userId || ipKeyGenerator(req.ip ?? '', 56);
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json(fail(ErrorCode.RATE_LIMITED, '重置密码操作过于频繁，请 1 分钟后再试'));
  },
});
