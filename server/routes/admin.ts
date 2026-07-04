/**
 * server/routes/admin.ts — 管理员路由
 *
 * GET    /api/admin/users               — 用户列表
 * PUT    /api/admin/users/:id           — 更新用户
 * DELETE /api/admin/users/:id           — 删除用户
 * POST   /api/admin/users/:id/reset-password — 重置密码
 *
 * 权限：
 * - super_admin: 全部操作，不可被删除
 * - admin: 管理普通用户，不能管理 admin/super_admin，不能删自己
 */

import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { authMiddleware, adminGuard } from '../middleware/auth.js';
import * as userRepo from '../db/repositories/user-repo.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('routes/admin');

const BCRYPT_COST = 12;

export function createAdminRouter(): Router {
  const router = Router();
  router.use(authMiddleware);
  router.use(adminGuard);

  // ── GET /api/admin/users ─────────────────────────────
  router.get('/users', async (req: Request, res: Response) => {
    try {
      const users = await userRepo.listAll();
      const isSuper = req.user!.role === 'super_admin';

      res.json({
        data: users
          // admin 看不到其他 admin/super_admin
          .filter((u) => isSuper || (u.role !== 'admin' && u.role !== 'super_admin'))
          .map((u) => ({
            id: u.id,
            username: u.username,
            email: u.email,
            role: u.role,
            createdAt: u.created_at,
          })),
      });
    } catch (err) {
      log.error('获取用户列表失败', { error: String(err) });
      res.status(500).json({
        error: { code: 'UNKNOWN_ERROR', message: '获取用户列表失败' },
      });
    }
  });

  // ── PUT /api/admin/users/:id ─────────────────────────
  router.put('/users/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const { username, email, role } = req.body;
      const isSuper = req.user!.role === 'super_admin';

      const user = await userRepo.findById(id);
      if (!user) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: '用户不存在' } });
        return;
      }

      // admin 不能编辑 super_admin
      if (!isSuper && user.role === 'super_admin') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: '无权操作超级管理员' } });
        return;
      }

      // admin 不能编辑其他 admin
      if (!isSuper && user.role === 'admin' && id !== req.user!.userId) {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: '无权操作其他管理员' } });
        return;
      }

      // 只有 super_admin 可以设置 role
      const fields: { username?: string; email?: string; role?: string } = {};
      if (username !== undefined) fields.username = username;
      if (email !== undefined) fields.email = email;
      if (role !== undefined && isSuper) fields.role = role;

      if (Object.keys(fields).length === 0) {
        res.status(400).json({ error: { code: 'INPUT_ERROR', message: '无更新字段' } });
        return;
      }

      await userRepo.adminUpdateUser(id, fields);
      res.json({ data: { id, updated: true } });
    } catch (err) {
      log.error('更新用户失败', { error: String(err) });
      res.status(500).json({ error: { code: 'UNKNOWN_ERROR', message: '更新用户失败' } });
    }
  });

  // ── DELETE /api/admin/users/:id ──────────────────────
  router.delete('/users/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const currentUserId = req.user!.userId;
      const isSuper = req.user!.role === 'super_admin';

      // 不能删自己
      if (id === currentUserId) {
        res.status(400).json({ error: { code: 'INPUT_ERROR', message: '不能删除自己的账户' } });
        return;
      }

      const user = await userRepo.findById(id);
      if (!user) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: '用户不存在' } });
        return;
      }

      // 超级管理员不可被删除
      if (user.role === 'super_admin') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: '不能删除超级管理员' } });
        return;
      }

      // admin 不能删除其他 admin
      if (!isSuper && user.role === 'admin') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: '无权删除其他管理员' } });
        return;
      }

      await userRepo.adminDeleteUser(id);
      res.json({ data: { deleted: true } });
    } catch (err) {
      log.error('删除用户失败', { error: String(err) });
      res.status(500).json({ error: { code: 'UNKNOWN_ERROR', message: '删除用户失败' } });
    }
  });

  // ── POST /api/admin/users/:id/reset-password ─────────
  router.post('/users/:id/reset-password', async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const { newPassword } = req.body;
      const isSuper = req.user!.role === 'super_admin';

      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        res.status(400).json({
          error: { code: 'INPUT_ERROR', message: '新密码至少 6 个字符' },
        });
        return;
      }

      const user = await userRepo.findById(id);
      if (!user) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: '用户不存在' } });
        return;
      }

      // admin 不能重置 super_admin 的密码
      if (!isSuper && user.role === 'super_admin') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: '无权操作超级管理员' } });
        return;
      }

      if (!isSuper && user.role === 'admin' && id !== req.user!.userId) {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: '无权操作其他管理员' } });
        return;
      }

      const hash = await bcrypt.hash(newPassword, BCRYPT_COST);
      await userRepo.updatePassword(id, hash);

      log.info('管理员重置用户密码', { adminId: req.user!.userId, targetUserId: id });
      res.json({ data: { reset: true } });
    } catch (err) {
      log.error('重置密码失败', { error: String(err) });
      res.status(500).json({ error: { code: 'UNKNOWN_ERROR', message: '重置密码失败' } });
    }
  });

  return router;
}
