/**
 * server/middleware/rate-limit.ts — 限流中间件
 *
 * 登录：5 次/分钟/IP
 * 生成：10 次/分钟/用户
 */

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request, Response } from 'express';

/**
 * 登录限流：5 次/分钟/IP。
 * 防止暴力破解。
 */
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: '登录过于频繁，请 1 分钟后再试',
    },
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
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: '生成请求过于频繁，请 1 分钟后再试',
    },
  },
});
