/**
 * server/routes/admin/generations.ts — 生成记录管理子路由
 *
 * 统一使用 throw AppError + asyncHandler 模式，由全局 error handler 处理。
 */

import { Router, type Request, type Response } from 'express';
import { superAdminGuard } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import * as generationRepo from '../../db/repositories/generation-repo.js';
import { success } from '../../utils/response.js';
import { parsePagination, wrapPagination, validateBatchIds } from '../../utils/route-helpers.js';

export function mountGenerations(router: Router): void {
  // ── GET /generation-records ─────────────────────────
  router.get('/generation-records', asyncHandler(async (req: Request, res: Response) => {
    const pag = parsePagination(req.query);
    const [items, total] = await Promise.all([
      generationRepo.listAll(pag.limit, pag.offset),
      generationRepo.countAll(),
    ]);

    res.json(success(wrapPagination(
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
    )));
  }));

  // ── POST /generation-records/batch-delete ───────────
  router.post('/generation-records/batch-delete', superAdminGuard, asyncHandler(async (req: Request, res: Response) => {
    const ids = validateBatchIds(req.body);
    await generationRepo.batchRemove(ids);
    res.json(success({ deleted: ids.length }));
  }));

  // ── POST /generation-records/clear ──────────────────
  router.post('/generation-records/clear', superAdminGuard, asyncHandler(async (_req: Request, res: Response) => {
    await generationRepo.clearAll();
    res.json(success({ cleared: true }));
  }));
}