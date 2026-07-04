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
 */

import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { authMiddleware } from '../middleware/auth.js';
import * as contentRepo from '../db/repositories/content-repo.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('routes/content');

export function createContentRouter(): Router {
  const router = Router();

  // 全部需要认证
  router.use(authMiddleware);

  // ── GET /api/content ──────────────────────────────────
  /**
   * @swagger
   * /api/content:
   *   get:
   *     summary: 获取当前用户的内容列表
   *     tags: [内容管理]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *         description: 每页条数
   *       - in: query
   *         name: offset
   *         schema: { type: integer, default: 0 }
   *         description: 偏移量
   *     responses:
   *       200:
   *         description: 内容列表
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;
      const list = await contentRepo.listByUser(req.user!.userId, limit, offset);
      res.json({ data: list });
    } catch (err) {
      log.error('获取内容列表失败', { error: err });
      res.status(500).json({
        error: { code: 'UNKNOWN_ERROR', message: '获取内容列表失败' },
      });
    }
  });

  // ── GET /api/content/:id ─────────────────────────────
  /**
   * @swagger
   * /api/content/{id}:
   *   get:
   *     summary: 获取内容详情
   *     tags: [内容管理]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: 内容详情
   *       404:
   *         description: 内容不存在
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const content = await contentRepo.findById(id);
      if (!content) {
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: '内容不存在' },
        });
        return;
      }
      res.json({ data: content });
    } catch (err) {
      log.error('获取内容详情失败', { error: err });
      res.status(500).json({
        error: { code: 'UNKNOWN_ERROR', message: '获取内容详情失败' },
      });
    }
  });

  // ── POST /api/content ────────────────────────────────
  /**
   * @swagger
   * /api/content:
   *   post:
   *     summary: 保存新内容
   *     tags: [内容管理]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [topic, platform, titles, cover, pages, tags, metadata]
   *     responses:
   *       201:
   *         description: 创建成功
   *       400:
   *         description: 参数错误
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { topic, platform, titles, cover, pages, tags, summary, extraRequirements, metadata } = req.body;

      // 参数校验
      if (!topic || !platform || !titles || !cover || !pages || !tags || !metadata) {
        res.status(400).json({
          error: { code: 'INPUT_ERROR', message: '缺少必填字段：topic、platform、titles、cover、pages、tags、metadata' },
        });
        return;
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

      res.status(201).json({ data: { id } });
    } catch (err) {
      log.error('保存内容失败', { error: err });
      res.status(500).json({
        error: { code: 'UNKNOWN_ERROR', message: '保存内容失败' },
      });
    }
  });

  // ── PUT /api/content/:id ─────────────────────────────
  /**
   * @swagger
   * /api/content/{id}:
   *   put:
   *     summary: 更新内容
   *     tags: [内容管理]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: 更新成功
   */
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const existing = await contentRepo.findById(id);
      if (!existing) {
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: '内容不存在' },
        });
        return;
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

      res.json({ data: { id } });
    } catch (err) {
      log.error('更新内容失败', { error: err });
      res.status(500).json({
        error: { code: 'UNKNOWN_ERROR', message: '更新内容失败' },
      });
    }
  });

  // ── DELETE /api/content/:id ──────────────────────────
  /**
   * @swagger
   * /api/content/{id}:
   *   delete:
   *     summary: 删除内容
   *     tags: [内容管理]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: 删除成功
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const existing = await contentRepo.findById(id);
      if (!existing) {
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: '内容不存在' },
        });
        return;
      }

      await contentRepo.remove(id);
      res.json({ data: { deleted: true } });
    } catch (err) {
      log.error('删除内容失败', { error: err });
      res.status(500).json({
        error: { code: 'UNKNOWN_ERROR', message: '删除内容失败' },
      });
    }
  });

  return router;
}
