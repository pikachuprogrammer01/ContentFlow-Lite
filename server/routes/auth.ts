/**
 * server/routes/auth.ts — 认证路由
 *
 * POST /api/auth/register  — 注册
 * POST /api/auth/login     — 登录
 * GET  /api/auth/me        — 获取当前用户（需认证）
 *
 * 单 Token 模式：accessToken 有效期 24 小时，无刷新机制。
 * 适用场景：单次会话型应用，用户登出/Token 过期后重新登录即可。
 */

import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { authMiddleware } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rate-limit.js';
import * as userRepo from '../db/repositories/user-repo.js';
import { createLogger } from '../utils/logger.js';
import { validateRegisterInput, validateLoginInput, validateProfileInput } from '../utils/validate.js';

const log = createLogger('routes/auth');

const BCRYPT_COST = 12;

/** 生成 access token（24 小时有效期） */
function generateToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, config.jwt.secret, { expiresIn: '24h' });
}

export function createAuthRouter(): Router {
  const router = Router();

  // ── POST /api/auth/register ────────────────────────────
  router.post('/register', async (req: Request, res: Response) => {
    try {
      const result = validateRegisterInput(req.body);
      if (!result.valid) {
        res.status(400).json({
          error: { code: 'INPUT_ERROR', message: result.errors[0].message, errors: result.errors },
        });
        return;
      }

      const { username, password, email, adminKey } = result.values;

      // 检查用户名/邮箱唯一性
      const existingUser = await userRepo.findByUsername(username);
      if (existingUser) {
        res.status(409).json({
          error: { code: 'CONFLICT', message: '用户名已被注册' },
        });
        return;
      }

      const existingEmail = await userRepo.findByEmail(email);
      if (existingEmail) {
        res.status(409).json({
          error: { code: 'CONFLICT', message: '邮箱已被注册' },
        });
        return;
      }

      // 哈希密码
      const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

      // 确定角色：
      // 1. 提供管理员密钥 → admin
      // 2. 数据库中没有用户（首次安装） → admin
      // 3. 其他 → 普通用户
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

      log.info('用户注册成功', { username });

      res.status(201).json({
        user: { id: userId, username, email, role },
        accessToken,
      });
    } catch (err) {
      log.error('注册失败', { error: String(err) });
      res.status(500).json({
        error: { code: 'UNKNOWN_ERROR', message: '服务器内部错误' },
      });
    }
  });

  // ── POST /api/auth/login ───────────────────────────────
  router.post('/login', loginLimiter, async (req: Request, res: Response) => {
    try {
      const result = validateLoginInput(req.body);
      if (!result.valid) {
        res.status(400).json({
          error: { code: 'INPUT_ERROR', message: result.errors[0].message, errors: result.errors },
        });
        return;
      }

      const { username, password } = result.values;

      // 查找用户
      const user = await userRepo.findByUsername(username);
      if (!user) {
        res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: '该用户不存在！' },
        });
        return;
      }

      // 验证密码
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: '用户名或密码错误' },
        });
        return;
      }

      // 生成 Token
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
    } catch (err) {
      log.error('登录失败', { error: String(err) });
      res.status(500).json({
        error: { code: 'UNKNOWN_ERROR', message: '服务器内部错误' },
      });
    }
  });

  // ── GET /api/auth/me ───────────────────────────────────
  router.get('/me', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const user = await userRepo.findById(userId);

      if (!user) {
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: '用户不存在' },
        });
        return;
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
    } catch (err) {
      log.error('获取用户信息失败', { error: String(err) });
      res.status(500).json({
        error: { code: 'UNKNOWN_ERROR', message: '服务器内部错误' },
      });
    }
  });

  // ── PUT /api/auth/me ───────────────────────────────────
  router.put('/me', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const result = validateProfileInput(req.body);
      if (!result.valid) {
        res.status(400).json({
          error: { code: 'INPUT_ERROR', message: result.errors[0].message, errors: result.errors },
        });
        return;
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
    } catch (err) {
      log.error('更新用户信息失败', { error: String(err) });
      res.status(500).json({
        error: { code: 'UNKNOWN_ERROR', message: '更新用户信息失败' },
      });
    }
  });

  return router;
}
