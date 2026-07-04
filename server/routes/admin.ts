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
import { authMiddleware, adminGuard, superAdminGuard } from '../middleware/auth.js';
import { resetPasswordLimiter } from '../middleware/rate-limit.js';
import * as userRepo from '../db/repositories/user-repo.js';
import * as contentRepo from '../db/repositories/content-repo.js';
import * as generationRepo from '../db/repositories/generation-repo.js';
import * as promptRepo from '../db/repositories/prompt-repo.js';
import { createLogger } from '../utils/logger.js';
import { validatePassword, validateUsername, validateEmail } from '../utils/validate.js';

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
  router.post('/users/:id/reset-password', resetPasswordLimiter, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const { newPassword } = req.body;
      const isSuper = req.user!.role === 'super_admin';

      if (!newPassword || typeof newPassword !== 'string') {
        res.status(400).json({
          error: { code: 'INPUT_ERROR', message: '新密码不能为空' },
        });
        return;
      }

      const pwResult = validatePassword(newPassword);
      if (!pwResult.valid) {
        res.status(400).json({
          error: { code: 'INPUT_ERROR', message: pwResult.errors[0].message },
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

      // 幂等性：新旧密码相同时拒绝，避免重复 hash 浪费资源
      const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
      if (isSamePassword) {
        res.status(409).json({
          error: { code: 'CONFLICT', message: '新密码与当前密码相同，密码未变更' },
        });
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

  // ── GET /api/admin/contents ───────────────────────────
  router.get('/contents', async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const offset = (page - 1) * limit;

      const [items, total] = await Promise.all([
        contentRepo.listAll(limit, offset),
        contentRepo.countAll(),
      ]);

      res.json({
        data: {
          items: items.map((c) => ({
            id: c.id,
            userId: c.userId,
            topic: c.topic,
            platform: c.platform,
            summary: c.summary,
            tags: c.tags,
            createdAt: c.metadata?.createdAt || '',
            titleCount: c.titles?.length || 0,
            pageCount: c.pages?.length || 0,
          })),
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      });
    } catch (err) {
      log.error('获取内容列表失败', { error: String(err) });
      res.status(500).json({ error: { code: 'UNKNOWN_ERROR', message: '获取内容列表失败' } });
    }
  });

  // ── DELETE /api/admin/contents/:id ────────────────────
  router.delete('/contents/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const content = await contentRepo.findById(id);
      if (!content) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: '内容不存在' } });
        return;
      }
      await contentRepo.remove(id);
      log.info('管理员删除内容', { adminId: req.user!.userId, contentId: id });
      res.json({ data: { deleted: true } });
    } catch (err) {
      log.error('删除内容失败', { error: String(err) });
      res.status(500).json({ error: { code: 'UNKNOWN_ERROR', message: '删除内容失败' } });
    }
  });

  // ── POST /api/admin/contents/batch-delete ────────────
  router.post('/contents/batch-delete', superAdminGuard, async (req: Request, res: Response) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100) {
        res.status(400).json({ error: { code: 'INPUT_ERROR', message: 'ids 必须是非空数组，最多 100 条' } });
        return;
      }
      await contentRepo.batchRemove(ids);
      log.info('超级管理员批量删除内容', { adminId: req.user!.userId, count: ids.length });
      res.json({ data: { deleted: ids.length } });
    } catch (err) {
      log.error('批量删除内容失败', { error: String(err) });
      res.status(500).json({ error: { code: 'UNKNOWN_ERROR', message: '批量删除内容失败' } });
    }
  });

  // ── GET /api/admin/generation-records ────────────────
  router.get('/generation-records', async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const offset = (page - 1) * limit;

      const [items, total] = await Promise.all([
        generationRepo.listAll(limit, offset),
        generationRepo.countAll(),
      ]);

      res.json({
        data: {
          items: items.map((r) => ({
            id: r.id,
            userId: r.user_id,
            contentId: r.content_id,
            topic: r.topic,
            platform: r.platform,
            promptId: r.prompt_id,
            promptVersion: r.prompt_version,
            model: r.model,
            createdAt: r.created_at,
          })),
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      });
    } catch (err) {
      log.error('获取生成记录失败', { error: String(err) });
      res.status(500).json({ error: { code: 'UNKNOWN_ERROR', message: '获取生成记录失败' } });
    }
  });

  // ── POST /api/admin/generation-records/batch-delete ──
  router.post('/generation-records/batch-delete', superAdminGuard, async (req: Request, res: Response) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100) {
        res.status(400).json({ error: { code: 'INPUT_ERROR', message: 'ids 必须是非空数组，最多 100 条' } });
        return;
      }
      await generationRepo.batchRemove(ids);
      log.info('超级管理员批量删除生成记录', { adminId: req.user!.userId, count: ids.length });
      res.json({ data: { deleted: ids.length } });
    } catch (err) {
      log.error('批量删除生成记录失败', { error: String(err) });
      res.status(500).json({ error: { code: 'UNKNOWN_ERROR', message: '批量删除生成记录失败' } });
    }
  });

  // ── POST /api/admin/generation-records/clear ─────────
  router.post('/generation-records/clear', superAdminGuard, async (_req: Request, res: Response) => {
    try {
      await generationRepo.clearAll();
      log.info('超级管理员清空全部生成记录', { adminId: _req.user!.userId });
      res.json({ data: { cleared: true } });
    } catch (err) {
      log.error('清空生成记录失败', { error: String(err) });
      res.status(500).json({ error: { code: 'UNKNOWN_ERROR', message: '清空生成记录失败' } });
    }
  });

  // ── GET /api/admin/prompt-templates ──────────────────
  router.get('/prompt-templates', async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const offset = (page - 1) * limit;

      const [items, total] = await Promise.all([
        promptRepo.listAllTemplates(limit, offset),
        promptRepo.countAllTemplates(),
      ]);

      res.json({
        data: {
          items: items.map((t) => ({
            id: t.id,
            userId: t.user_id,
            name: t.name,
            type: t.type,
            platform: t.platform,
            isDefault: !!t.is_default,
            updatedAt: t.updated_at,
          })),
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      });
    } catch (err) {
      log.error('获取 Prompt 模板列表失败', { error: String(err) });
      res.status(500).json({ error: { code: 'UNKNOWN_ERROR', message: '获取 Prompt 模板列表失败' } });
    }
  });

  // ── DELETE /api/admin/prompt-templates/:id ────────────
  router.delete('/prompt-templates/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const template = await promptRepo.findTemplateById(id);
      if (!template) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: '模板不存在' } });
        return;
      }
      await promptRepo.deleteTemplate(id);
      log.info('管理员删除 Prompt 模板', { adminId: req.user!.userId, templateId: id });
      res.json({ data: { deleted: true } });
    } catch (err) {
      log.error('删除 Prompt 模板失败', { error: String(err) });
      res.status(500).json({ error: { code: 'UNKNOWN_ERROR', message: '删除 Prompt 模板失败' } });
    }
  });

  // ── POST /api/admin/prompt-templates/batch-delete ────
  router.post('/prompt-templates/batch-delete', superAdminGuard, async (req: Request, res: Response) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100) {
        res.status(400).json({ error: { code: 'INPUT_ERROR', message: 'ids 必须是非空数组，最多 100 条' } });
        return;
      }
      await promptRepo.batchDeleteTemplates(ids);
      log.info('超级管理员批量删除 Prompt 模板', { adminId: req.user!.userId, count: ids.length });
      res.json({ data: { deleted: ids.length } });
    } catch (err) {
      log.error('批量删除 Prompt 模板失败', { error: String(err) });
      res.status(500).json({ error: { code: 'UNKNOWN_ERROR', message: '批量删除 Prompt 模板失败' } });
    }
  });

  // ── GET /api/admin/prompt-versions ───────────────────
  router.get('/prompt-versions', async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const offset = (page - 1) * limit;

      const [items, total] = await Promise.all([
        promptRepo.listAllVersions(limit, offset),
        promptRepo.countAllVersions(),
      ]);

      res.json({
        data: {
          items: items.map((v) => ({
            id: v.id,
            promptId: v.prompt_id,
            version: v.version,
            templateName: v.template_name || '—',
            platform: v.platform || '—',
            createdAt: v.created_at,
          })),
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      });
    } catch (err) {
      log.error('获取 Prompt 版本列表失败', { error: String(err) });
      res.status(500).json({ error: { code: 'UNKNOWN_ERROR', message: '获取 Prompt 版本列表失败' } });
    }
  });

  return router;
}
