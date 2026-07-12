/**
 * server/routes/auth.ts — 认证路由
 *
 * POST /api/auth/register  — 注册
 * POST /api/auth/login     — 登录
 * GET  /api/auth/me        — 获取当前用户（需认证）
 * PUT  /api/auth/me        — 更新个人信息（需认证）
 *
 * 单 Token 模式：accessToken 有效期 24 小时，无刷新机制。
 * 错误通过 throw AppError 抛出，由全局 error-handler 统一处理。
 */

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

/** 生成 access token（24 小时有效期） */
function generateToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, config.jwt.secret, { expiresIn: '24h' });
}

export function createAuthRouter(): Router {
  const router = Router();

  // ── POST /api/auth/register ────────────────────────────
  router.post(
    '/register',
    asyncHandler(async (req: Request, res: Response) => {
      const result = validateRegisterInput(req.body);
      if (!result.valid) {
        throw new ValidationError(result.errors[0].message, result.errors);
      }

      const { username, password, email, adminKey } = result.values;

      // 检查用户名/邮箱唯一性
      const existingUser = await userRepo.findByUsername(username);
      if (existingUser) {
        throw new ConflictError('用户名已被注册');
      }

      const existingEmail = await userRepo.findByEmail(email);
      if (existingEmail) {
        throw new ConflictError('邮箱已被注册');
      }

      // 哈希密码
      const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

      // 确定角色：adminKey 正确 → admin，首用户 → admin，其余 → user
      // 注：super_admin 只能由系统初始化创建，不可通过注册获得
      const setupKey = config.admin.setupKey;
      const isAdmin = !!(adminKey && setupKey && adminKey === setupKey);
      const userCount = await userRepo.countAll();
      const role: 'super_admin' | 'admin' | 'user' =
        isAdmin || userCount === 0 ? 'admin' : 'user';

      // 创建用户
      const userId = randomUUID();
      await userRepo.create({ id: userId, username, email, passwordHash, role });

      // 生成 Token
      const accessToken = generateToken(userId, role);

      log.info('用户注册成功', { username, role });

      res.status(201).json({
        user: { id: userId, username, email, role },
        accessToken,
      });
    }),
  );

  // ── POST /api/auth/login ───────────────────────────────
  router.post(
    '/login',
    loginLimiter,
    asyncHandler(async (req: Request, res: Response) => {
      const result = validateLoginInput(req.body);
      if (!result.valid) {
        throw new ValidationError(result.errors[0].message, result.errors);
      }

      const { username, password } = result.values;

      const user = await userRepo.findByUsername(username);
      if (!user) {
        throw new AuthError('该用户不存在！');
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        throw new AuthError('用户名或密码错误');
      }

      const accessToken = generateToken(user.id, user.role);

      log.info('用户登录成功', { userId: user.id });

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        accessToken,
      });
    }),
  );

  // ── GET /api/auth/me ───────────────────────────────────
  router.get(
    '/me',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.user!.userId;
      const user = await userRepo.findById(userId);

      if (!user) {
        throw new NotFoundError('用户不存在');
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.created_at,
        },
      });
    }),
  );

  // ── PUT /api/auth/me ───────────────────────────────────
  router.put(
    '/me',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.user!.userId;
      const result = validateProfileInput(req.body);
      if (!result.valid) {
        throw new ValidationError(result.errors[0].message, result.errors);
      }

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
    }),
  );

  return router;
}
