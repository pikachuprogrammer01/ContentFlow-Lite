/**
 * server/routes/admin/prompts.ts — Prompt 模板/版本管理子路由
 *
 * 统一使用 throw AppError + asyncHandler 模式，由全局 error handler 处理。
 */

import { Router, type Request, type Response } from 'express';
import { superAdminGuard } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import * as promptRepo from '../../db/repositories/prompt-repo.js';
import { NotFoundError } from '../../utils/errors.js';
import { success } from '../../utils/response.js';
import { parsePagination, wrapPagination, validateBatchIds } from '../../utils/route-helpers.js';

export function mountPrompts(router: Router): void {
  // ── GET /prompt-templates ───────────────────────────
  router.get('/prompt-templates', asyncHandler(async (req: Request, res: Response) => {
    const pag = parsePagination(req.query);
    const [items, total] = await Promise.all([
      promptRepo.listAllTemplates(pag.limit, pag.offset),
      promptRepo.countAllTemplates(),
    ]);

    res.json(success(wrapPagination(
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
    )));
  }));

  // ── DELETE /prompt-templates/:id ────────────────────
  router.delete('/prompt-templates/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const template = await promptRepo.findTemplateById(id);
    if (!template) throw new NotFoundError('模板不存在');
    await promptRepo.deleteTemplate(id);
    res.json(success({ deleted: true }));
  }));

  // ── POST /prompt-templates/batch-delete ─────────────
  router.post('/prompt-templates/batch-delete', superAdminGuard, asyncHandler(async (req: Request, res: Response) => {
    const ids = validateBatchIds(req.body);
    await promptRepo.batchDeleteTemplates(ids);
    res.json(success({ deleted: ids.length }));
  }));

  // ── GET /prompt-versions ────────────────────────────
  router.get('/prompt-versions', asyncHandler(async (req: Request, res: Response) => {
    const pag = parsePagination(req.query);
    const [items, total] = await Promise.all([
      promptRepo.listAllVersions(pag.limit, pag.offset),
      promptRepo.countAllVersions(),
    ]);

    res.json(success(wrapPagination(
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
    )));
  }));
}