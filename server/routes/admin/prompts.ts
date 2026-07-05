/**
 * server/routes/admin/prompts.ts — Prompt 模板/版本管理子路由
 */

import { Router, type Request, type Response } from 'express';
import { superAdminGuard } from '../../middleware/auth.js';
import * as promptRepo from '../../db/repositories/prompt-repo.js';
import { createLogger } from '../../utils/logger.js';
import { parsePagination, wrapPagination, validateBatchIds, handleError } from '../../utils/route-helpers.js';

const log = createLogger('admin/prompts');

export function mountPrompts(router: Router): void {
  // ── GET /prompt-templates ───────────────────────────
  router.get('/prompt-templates', async (req: Request, res: Response) => {
    try {
      const pag = parsePagination(req.query);
      const [items, total] = await Promise.all([
        promptRepo.listAllTemplates(pag.limit, pag.offset),
        promptRepo.countAllTemplates(),
      ]);

      res.json({
        data: wrapPagination(
          items.map((t) => ({
            id: t.id,
            userId: t.user_id,
            name: t.name,
            type: t.type,
            platform: t.platform,
            isDefault: !!t.is_default,
            updatedAt: t.updated_at,
          })),
          total,
          pag,
        ),
      });
    } catch (err) {
      handleError(res, log, '获取 Prompt 模板列表', err);
    }
  });

  // ── DELETE /prompt-templates/:id ────────────────────
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
      handleError(res, log, '删除 Prompt 模板', err);
    }
  });

  // ── POST /prompt-templates/batch-delete ─────────────
  router.post('/prompt-templates/batch-delete', superAdminGuard, async (req: Request, res: Response) => {
    try {
      const ids = validateBatchIds(res, req.body);
      if (!ids) return;
      await promptRepo.batchDeleteTemplates(ids);
      log.info('超级管理员批量删除 Prompt 模板', { adminId: req.user!.userId, count: ids.length });
      res.json({ data: { deleted: ids.length } });
    } catch (err) {
      handleError(res, log, '批量删除 Prompt 模板', err);
    }
  });

  // ── GET /prompt-versions ────────────────────────────
  router.get('/prompt-versions', async (req: Request, res: Response) => {
    try {
      const pag = parsePagination(req.query);
      const [items, total] = await Promise.all([
        promptRepo.listAllVersions(pag.limit, pag.offset),
        promptRepo.countAllVersions(),
      ]);

      res.json({
        data: wrapPagination(
          items.map((v) => ({
            id: v.id,
            promptId: v.prompt_id,
            version: v.version,
            templateName: v.template_name || '—',
            platform: v.platform || '—',
            createdAt: v.created_at,
          })),
          total,
          pag,
        ),
      });
    } catch (err) {
      handleError(res, log, '获取 Prompt 版本列表', err);
    }
  });
}
