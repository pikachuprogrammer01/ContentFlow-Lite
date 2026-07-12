/**
 * server/routes/admin/contents.ts — 内容管理子路由
 *
 * 统一使用 throw AppError + asyncHandler 模式，由全局 error handler 处理。
 */

import { Router, type Request, type Response } from 'express';
import { superAdminGuard } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import * as contentRepo from '../../db/repositories/content-repo.js';
import { NotFoundError } from '../../utils/errors.js';
import { success } from '../../utils/response.js';
import { parsePagination, wrapPagination, validateBatchIds } from '../../utils/route-helpers.js';

export function mountContents(router: Router): void {
  // ── GET /contents ───────────────────────────────────
  router.get('/contents', asyncHandler(async (req: Request, res: Response) => {
    const pag = parsePagination(req.query);
    const [items, total] = await Promise.all([
      contentRepo.listAll(pag.limit, pag.offset),
      contentRepo.countAll(),
    ]);

    res.json(success(wrapPagination(
      items.map((c) => ({
        id: c.id,
        userId: c.userId,
        username: c.username || "—",
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
    )));
  }));

  // ── GET /contents/:id ──────────────────────────────
  router.get('/contents/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const content = await contentRepo.findById(id);
    if (!content) throw new NotFoundError('内容不存在');
    res.json(success({
      id: content.id,
      topic: content.topic,
      platform: content.platform,
      summary: content.summary,
      tags: content.tags,
      titles: content.titles,
      cover: content.cover,
      pages: content.pages,
      extraRequirements: content.extraRequirements,
      metadata: content.metadata,
    }));
  }));

  // ── DELETE /contents/:id ────────────────────────────
  router.delete('/contents/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const content = await contentRepo.findById(id);
    if (!content) throw new NotFoundError('内容不存在');
    await contentRepo.remove(id);
    res.json(success({ deleted: true }));
  }));

  // ── POST /contents/batch-delete ─────────────────────
  router.post('/contents/batch-delete', superAdminGuard, asyncHandler(async (req: Request, res: Response) => {
    const ids = validateBatchIds(req.body);
    await contentRepo.batchRemove(ids);
    res.json(success({ deleted: ids.length }));
  }));
}