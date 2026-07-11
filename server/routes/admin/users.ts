/**
 * server/routes/admin/users.ts — 用户管理子路由
 *
 * 统一使用 throw AppError + asyncHandler 模式，由全局 error handler 处理。
 */

import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { resetPasswordLimiter } from '../../middleware/rate-limit.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import * as userRepo from '../../db/repositories/user-repo.js';
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from '../../utils/errors.js';
import { success } from '../../utils/response.js';
import { validatePassword, validateUsername, validateEmail } from '../../utils/validate.js';

const BCRYPT_COST = 12;

export function mountUsers(router: Router): void {
  // ── GET /users ──────────────────────────────────────
  router.get('/users', asyncHandler(async (req: Request, res: Response) => {
    const users = await userRepo.listAll();
    const isSuper = req.user!.role === 'super_admin';

    res.json(success(
      users
        .filter((u) => isSuper || (u.role !== 'admin' && u.role !== 'super_admin'))
        .map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          role: u.role,
          createdAt: u.created_at,
          updatedAt: u.updated_at,
        })),
    ));
  }));

  // ── PUT /users/:id ──────────────────────────────────
  router.put('/users/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { username, email, role } = req.body;
    const isSuper = req.user!.role === 'super_admin';

    const user = await userRepo.findById(id);
    if (!user) throw new NotFoundError('用户不存在');

    if (!isSuper && user.role === 'super_admin') {
      throw new ForbiddenError('无权操作超级管理员');
    }

    if (!isSuper && user.role === 'admin' && id !== req.user!.userId) {
      throw new ForbiddenError('无权操作其他管理员');
    }

    const fields: { username?: string; email?: string; role?: string } = {};
    if (username !== undefined) {
      const r = validateUsername(username);
      if (!r.valid) throw new ValidationError(r.errors[0].message);
      fields.username = r.values.username;
    }
    if (email !== undefined) {
      const r = validateEmail(email);
      if (!r.valid) throw new ValidationError(r.errors[0].message);
      fields.email = r.values.email;
    }
    if (role !== undefined && isSuper) fields.role = role;

    if (Object.keys(fields).length === 0) throw new ValidationError('无更新字段');

    await userRepo.adminUpdateUser(id, fields);
    res.json(success({ id, updated: true }));
  }));

  // ── DELETE /users/:id ───────────────────────────────
  router.delete('/users/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const currentUserId = req.user!.userId;
    const isSuper = req.user!.role === 'super_admin';

    if (id === currentUserId) throw new ValidationError('不能删除自己的账户');

    const user = await userRepo.findById(id);
    if (!user) throw new NotFoundError('用户不存在');

    if (user.role === 'super_admin') throw new ForbiddenError('不能删除超级管理员');
    if (!isSuper && user.role === 'admin') throw new ForbiddenError('无权删除其他管理员');

    await userRepo.adminDeleteUser(id);
    res.json(success({ deleted: true }));
  }));

  // ── POST /users/:id/reset-password ──────────────────
  router.post('/users/:id/reset-password', resetPasswordLimiter, asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { newPassword } = req.body;
    const isSuper = req.user!.role === 'super_admin';

    if (!newPassword || typeof newPassword !== 'string') {
      throw new ValidationError('新密码不能为空');
    }

    const pwResult = validatePassword(newPassword);
    if (!pwResult.valid) throw new ValidationError(pwResult.errors[0].message);

    const user = await userRepo.findById(id);
    if (!user) throw new NotFoundError('用户不存在');

    if (!isSuper && user.role === 'super_admin') {
      throw new ForbiddenError('无权操作超级管理员');
    }

    if (!isSuper && user.role === 'admin' && id !== req.user!.userId) {
      throw new ForbiddenError('无权操作其他管理员');
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
    if (isSamePassword) throw new ConflictError('新密码与当前密码相同，密码未变更');

    const hash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await userRepo.updatePassword(id, hash);

    res.json(success({ reset: true }));
  }));
}