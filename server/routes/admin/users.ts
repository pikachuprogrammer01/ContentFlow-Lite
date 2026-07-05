/**
 * server/routes/admin/users.ts — 用户管理子路由
 */

import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { resetPasswordLimiter } from '../../middleware/rate-limit.js';
import * as userRepo from '../../db/repositories/user-repo.js';
import { createLogger } from '../../utils/logger.js';
import { validatePassword, validateUsername, validateEmail } from '../../utils/validate.js';
import { handleError } from '../../utils/route-helpers.js';

const log = createLogger('admin/users');
const BCRYPT_COST = 12;

export function mountUsers(router: Router): void {
  // ── GET /users ──────────────────────────────────────
  router.get('/users', async (req: Request, res: Response) => {
    try {
      const users = await userRepo.listAll();
      const isSuper = req.user!.role === 'super_admin';

      res.json({
        data: users
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
      handleError(res, log, '获取用户列表', err);
    }
  });

  // ── PUT /users/:id ──────────────────────────────────
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

      if (!isSuper && user.role === 'super_admin') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: '无权操作超级管理员' } });
        return;
      }

      if (!isSuper && user.role === 'admin' && id !== req.user!.userId) {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: '无权操作其他管理员' } });
        return;
      }

      const fields: { username?: string; email?: string; role?: string } = {};
      if (username !== undefined) {
        const r = validateUsername(username);
        if (!r.valid) {
          res.status(400).json({ error: { code: 'INPUT_ERROR', message: r.errors[0].message } });
          return;
        }
        fields.username = r.values.username;
      }
      if (email !== undefined) {
        const r = validateEmail(email);
        if (!r.valid) {
          res.status(400).json({ error: { code: 'INPUT_ERROR', message: r.errors[0].message } });
          return;
        }
        fields.email = r.values.email;
      }
      if (role !== undefined && isSuper) fields.role = role;

      if (Object.keys(fields).length === 0) {
        res.status(400).json({ error: { code: 'INPUT_ERROR', message: '无更新字段' } });
        return;
      }

      await userRepo.adminUpdateUser(id, fields);
      res.json({ data: { id, updated: true } });
    } catch (err) {
      handleError(res, log, '更新用户', err);
    }
  });

  // ── DELETE /users/:id ───────────────────────────────
  router.delete('/users/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const currentUserId = req.user!.userId;
      const isSuper = req.user!.role === 'super_admin';

      if (id === currentUserId) {
        res.status(400).json({ error: { code: 'INPUT_ERROR', message: '不能删除自己的账户' } });
        return;
      }

      const user = await userRepo.findById(id);
      if (!user) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: '用户不存在' } });
        return;
      }

      if (user.role === 'super_admin') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: '不能删除超级管理员' } });
        return;
      }

      if (!isSuper && user.role === 'admin') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: '无权删除其他管理员' } });
        return;
      }

      await userRepo.adminDeleteUser(id);
      res.json({ data: { deleted: true } });
    } catch (err) {
      handleError(res, log, '删除用户', err);
    }
  });

  // ── POST /users/:id/reset-password ──────────────────
  router.post('/users/:id/reset-password', resetPasswordLimiter, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const { newPassword } = req.body;
      const isSuper = req.user!.role === 'super_admin';

      if (!newPassword || typeof newPassword !== 'string') {
        res.status(400).json({ error: { code: 'INPUT_ERROR', message: '新密码不能为空' } });
        return;
      }

      const pwResult = validatePassword(newPassword);
      if (!pwResult.valid) {
        res.status(400).json({ error: { code: 'INPUT_ERROR', message: pwResult.errors[0].message } });
        return;
      }

      const user = await userRepo.findById(id);
      if (!user) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: '用户不存在' } });
        return;
      }

      if (!isSuper && user.role === 'super_admin') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: '无权操作超级管理员' } });
        return;
      }

      if (!isSuper && user.role === 'admin' && id !== req.user!.userId) {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: '无权操作其他管理员' } });
        return;
      }

      const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
      if (isSamePassword) {
        res.status(409).json({ error: { code: 'CONFLICT', message: '新密码与当前密码相同，密码未变更' } });
        return;
      }

      const hash = await bcrypt.hash(newPassword, BCRYPT_COST);
      await userRepo.updatePassword(id, hash);

      log.info('管理员重置用户密码', { adminId: req.user!.userId, targetUserId: id });
      res.json({ data: { reset: true } });
    } catch (err) {
      handleError(res, log, '重置密码', err);
    }
  });
}
