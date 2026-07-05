/**
 * server/routes/admin/contents.ts — 内容管理子路由
 */

import { Router, type Request, type Response } from 'express';
import { superAdminGuard } from '../../middleware/auth.js';
import * as contentRepo from '../../db/repositories/content-repo.js';
import { createLogger } from '../../utils/logger.js';
import { parsePagination, wrapPagination, validateBatchIds, handleError } from '../../utils/route-helpers.js';

const log = createLogger('admin/contents');

export function mountContents(router: Router): void {
  // ── GET /contents ───────────────────────────────────
  router.get('/contents', async (req: Request, res: Response) => {
    try {
      const pag = parsePagination(req.query);
      const [items, total] = await Promise.all([
        contentRepo.listAll(pag.limit, pag.offset),
        contentRepo.countAll(),
      ]);

      res.json({
        data: wrapPagination(
          items.map((c) => ({
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
          total,
          pag,
        ),
      });
    } catch (err) {
      handleError(res, log, '获取内容列表', err);
    }
  });

  // ── DELETE /contents/:id ────────────────────────────
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
      handleError(res, log, '删除内容', err);
    }
  });

  // ── POST /contents/batch-delete ─────────────────────
  router.post('/contents/batch-delete', superAdminGuard, async (req: Request, res: Response) => {
    try {
      const ids = validateBatchIds(res, req.body);
      if (!ids) return;
      await contentRepo.batchRemove(ids);
      log.info('超级管理员批量删除内容', { adminId: req.user!.userId, count: ids.length });
      res.json({ data: { deleted: ids.length } });
    } catch (err) {
      handleError(res, log, '批量删除内容', err);
    }
  });
}
