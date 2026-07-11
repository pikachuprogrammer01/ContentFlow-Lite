/**
 * server/routes/content.ts — 内容路由
 *
 * GET    /api/content         — 获取当前用户的内容列表
 * GET    /api/content/:id     — 获取单条内容详情
 * POST   /api/content         — 保存新内容
 * PUT    /api/content/:id     — 更新内容
 * DELETE /api/content/:id     — 删除内容
 *
 * 所有端点均需认证（Bearer Token）。
 * 统一使用 throw AppError + asyncHandler 模式，由全局 error handler 处理。
 */

import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error-handler.js';
import * as contentRepo from '../db/repositories/content-repo.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { success, created } from '../utils/response.js';

export function createContentRouter(): Router {
  const router = Router();

  router.use(authMiddleware);

  // ── GET /api/content ──────────────────────────────────
  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;
    const list = await contentRepo.listByUser(req.user!.userId, limit, offset);
    res.json(success(list));
  }));

  // ── GET /api/content/:id ─────────────────────────────
  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const content = await contentRepo.findById(id);
    if (!content) {
      throw new NotFoundError('内容不存在');
    }
    res.json(success(content));
  }));

  // ── POST /api/content ────────────────────────────────
  router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { topic, platform, titles, cover, pages, tags, summary, extraRequirements, metadata } = req.body;

    if (!topic || !platform || !titles || !cover || !pages || !tags || !metadata) {
      throw new ValidationError('缺少必填字段：topic、platform、titles、cover、pages、tags、metadata');
    }

    const id = randomUUID();
    await contentRepo.save(req.user!.userId, {
      id,
      topic,
      platform,
      titles,
      cover,
      pages,
      tags,
      summary,
      extraRequirements,
      metadata: { ...metadata, createdAt: metadata.createdAt || new Date().toISOString() },
    });

    res.status(201).json(created({ id }));
  }));

  // ── PUT /api/content/:id ─────────────────────────────
  router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const existing = await contentRepo.findById(id);
    if (!existing) {
      throw new NotFoundError('内容不存在');
    }

    const { topic, platform, titles, cover, pages, tags, summary, extraRequirements, metadata } = req.body;

    await contentRepo.save(req.user!.userId, {
      id,
      topic: topic ?? existing.topic,
      platform: platform ?? existing.platform,
      titles: titles ?? existing.titles,
      cover: cover ?? existing.cover,
      pages: pages ?? existing.pages,
      tags: tags ?? existing.tags,
      summary: summary !== undefined ? summary : existing.summary,
      extraRequirements: extraRequirements !== undefined ? extraRequirements : existing.extraRequirements,
      metadata: metadata ?? existing.metadata,
    });

    res.json(success({ id }));
  }));

  // ── DELETE /api/content/:id ──────────────────────────
  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const existing = await contentRepo.findById(id);
    if (!existing) {
      throw new NotFoundError('内容不存在');
    }

    await contentRepo.remove(id);
    res.json(success({ deleted: true }));
  }));

  return router;
}
