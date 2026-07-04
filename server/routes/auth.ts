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
      const { username, password, email } = req.body;

      // 参数校验
      if (!username || !password || !email) {
        res.status(400).json({
          error: { code: 'INPUT_ERROR', message: 'username、password、email 不能为空' },
        });
        return;
      }

      if (typeof username !== 'string' || username.trim().length < 2) {
        res.status(400).json({
          error: { code: 'INPUT_ERROR', message: '用户名至少 2 个字符' },
        });
        return;
      }

      if (typeof password !== 'string' || password.length < 6) {
        res.status(400).json({
          error: { code: 'INPUT_ERROR', message: '密码至少 6 个字符' },
        });
        return;
      }

      // 检查用户名/邮箱唯一性
      const existingUser = await userRepo.findByUsername(username.trim());
      if (existingUser) {
        res.status(409).json({
          error: { code: 'CONFLICT', message: '用户名已被注册' },
        });
        return;
      }

      const existingEmail = await userRepo.findByEmail(email.trim().toLowerCase());
      if (existingEmail) {
        res.status(409).json({
          error: { code: 'CONFLICT', message: '邮箱已被注册' },
        });
        return;
      }

      // 哈希密码
      const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

      // 第一个注册的用户自动成为管理员
      const userCount = await userRepo.countAll();
      const role = userCount === 0 ? 'admin' : 'user';

      // 创建用户
      const userId = randomUUID();
      await userRepo.create({
        id: userId,
        username: username.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        role,
      });

      // 生成 Token
      const accessToken = generateToken(userId, 'user');

      log.info('用户注册成功', { username: username.trim() });

      res.status(201).json({
        user: { id: userId, username: username.trim(), email: email.trim().toLowerCase(), role },
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
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({
          error: { code: 'INPUT_ERROR', message: '用户名和密码不能为空' },
        });
        return;
      }

      // 查找用户
      const user = await userRepo.findByUsername(username);
      if (!user) {
        res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: '用户名或密码错误' },
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
      const { username, email } = req.body;

      const fields: { username?: string; email?: string } = {};
      if (username !== undefined) fields.username = username;
      if (email !== undefined) fields.email = email;

      if (Object.keys(fields).length === 0) {
        res.status(400).json({
          error: { code: 'INPUT_ERROR', message: '至少需要提供 username 或 email' },
        });
        return;
      }

      await userRepo.updateProfile(userId, fields);

      // 返回更新后的用户信息
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
