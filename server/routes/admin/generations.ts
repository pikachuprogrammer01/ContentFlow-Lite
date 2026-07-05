/**
 * server/routes/admin/generations.ts — 生成记录管理子路由
 */

import { Router, type Request, type Response } from 'express';
import { superAdminGuard } from '../../middleware/auth.js';
import * as generationRepo from '../../db/repositories/generation-repo.js';
import { createLogger } from '../../utils/logger.js';
import { parsePagination, wrapPagination, validateBatchIds, handleError } from '../../utils/route-helpers.js';

const log = createLogger('admin/generations');

export function mountGenerations(router: Router): void {
  // ── GET /generation-records ─────────────────────────
  router.get('/generation-records', async (req: Request, res: Response) => {
    try {
      const pag = parsePagination(req.query);
      const [items, total] = await Promise.all([
        generationRepo.listAll(pag.limit, pag.offset),
        generationRepo.countAll(),
      ]);

      res.json({
        data: wrapPagination(
          items.map((r) => ({
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
          total,
          pag,
        ),
      });
    } catch (err) {
      handleError(res, log, '获取生成记录', err);
    }
  });

  // ── POST /generation-records/batch-delete ───────────
  router.post('/generation-records/batch-delete', superAdminGuard, async (req: Request, res: Response) => {
    try {
      const ids = validateBatchIds(res, req.body);
      if (!ids) return;
      await generationRepo.batchRemove(ids);
      log.info('超级管理员批量删除生成记录', { adminId: req.user!.userId, count: ids.length });
      res.json({ data: { deleted: ids.length } });
    } catch (err) {
      handleError(res, log, '批量删除生成记录', err);
    }
  });

  // ── POST /generation-records/clear ──────────────────
  router.post('/generation-records/clear', superAdminGuard, async (req: Request, res: Response) => {
    try {
      await generationRepo.clearAll();
      log.info('超级管理员清空全部生成记录', { adminId: req.user!.userId });
      res.json({ data: { cleared: true } });
    } catch (err) {
      handleError(res, log, '清空生成记录', err);
    }
  });
}
