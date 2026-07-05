/**
 * server/routes/prompt.ts — Prompt 模板路由
 *
 * GET    /api/prompt/templates           — 模板列表
 * POST   /api/prompt/templates           — 创建模板
 * GET    /api/prompt/templates/:id       — 模板详情
 * PUT    /api/prompt/templates/:id       — 更新模板（自动生成新版本）
 * DELETE /api/prompt/templates/:id       — 删除模板
 * GET    /api/prompt/versions/:promptId  — 版本列表
 *
 * 所有端点均需认证（Bearer Token）。
 */

import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { authMiddleware } from '../middleware/auth.js';
import * as promptRepo from '../db/repositories/prompt-repo.js';
import { createLogger } from '../utils/logger.js';
import type { PromptTemplateRow } from '../types.js';

const log = createLogger('routes/prompt');

export function createPromptRouter(): Router {
  const router = Router();

  // 全部需要认证
  router.use(authMiddleware);

  // ── GET /api/prompt/templates ────────────────────────
  /**
   * @swagger
   * /api/prompt/templates:
   *   get:
   *     summary: 获取当前用户的 Prompt 模板列表
   *     tags: [Prompt管理]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 模板列表
   */
  router.get('/templates', async (req: Request, res: Response) => {
    try {
      const templates = await promptRepo.listTemplates(req.user!.userId);
      res.json({ data: templates });
    } catch (err) {
      log.error('获取模板列表失败', { error: err });
      res.status(500).json({
        error: { code: 'UNKNOWN_ERROR', message: '获取模板列表失败' },
      });
    }
  });

  // ── GET /api/prompt/templates/:id ────────────────────
  /**
   * @swagger
   * /api/prompt/templates/{id}:
   *   get:
   *     summary: 获取模板详情
   *     tags: [Prompt管理]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: 模板详情
   *       404:
   *         description: 模板不存在
   */
  router.get('/templates/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const template = await promptRepo.findTemplateById(id);
      if (!template) {
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: '模板不存在' },
        });
        return;
      }
      res.json({ data: template });
    } catch (err) {
      log.error('获取模板详情失败', { error: err });
      res.status(500).json({
        error: { code: 'UNKNOWN_ERROR', message: '获取模板详情失败' },
      });
    }
  });

  // ── POST /api/prompt/templates ───────────────────────
  /**
   * @swagger
   * /api/prompt/templates:
   *   post:
   *     summary: 创建新 Prompt 模板
   *     tags: [Prompt管理]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, type, platform, systemPrompt, userPrompt]
   *     responses:
   *       201:
   *         description: 创建成功
   *       400:
   *         description: 参数错误
   */
  router.post('/templates', async (req: Request, res: Response) => {
    try {
      const { name, type, platform, systemPrompt, userPrompt, isDefault } = req.body;

      if (!name || !type || !platform || !systemPrompt || !userPrompt) {
        res.status(400).json({
          error: { code: 'INPUT_ERROR', message: '缺少必填字段：name、type、platform、systemPrompt、userPrompt' },
        });
        return;
      }

      if (!['text', 'image'].includes(type)) {
        res.status(400).json({
          error: { code: 'INPUT_ERROR', message: 'type 只能是 text 或 image' },
        });
        return;
      }

      const id = randomUUID();
      await promptRepo.createTemplate({
        id,
        user_id: req.user!.userId,
        name,
        type,
        is_default: isDefault ? 1 : 0,
        platform,
        system_prompt: systemPrompt,
        user_prompt: userPrompt,
        created_at: '',
        updated_at: '',
      });

      res.status(201).json({ data: { id } });
    } catch (err) {
      log.error('创建模板失败', { error: err });
      res.status(500).json({
        error: { code: 'UNKNOWN_ERROR', message: '创建模板失败' },
      });
    }
  });

  // ── PUT /api/prompt/templates/:id ────────────────────
  /**
   * @swagger
   * /api/prompt/templates/{id}:
   *   put:
   *     summary: 更新模板（自动生成新版本快照）
   *     tags: [Prompt管理]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: 更新成功（含新版本号）
   */
  router.put('/templates/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const existing = await promptRepo.findTemplateById(id);
      if (!existing) {
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: '模板不存在' },
        });
        return;
      }

      const { name, platform, systemPrompt, userPrompt, isDefault } = req.body;

      // 更新模板字段
      const fields: Partial<Pick<PromptTemplateRow, 'name' | 'system_prompt' | 'user_prompt' | 'is_default' | 'platform'>> = {};
      if (name !== undefined) fields.name = name;
      if (platform !== undefined) fields.platform = platform;
      if (systemPrompt !== undefined) fields.system_prompt = systemPrompt;
      if (userPrompt !== undefined) fields.user_prompt = userPrompt;
      if (isDefault !== undefined) fields.is_default = isDefault ? 1 : 0;

      if (Object.keys(fields).length > 0) {
        await promptRepo.updateTemplate(id, fields);
      }

      // 生成新版本快照
      const currentVersion = await promptRepo.getLatestVersion(id);
      const versionNumber = currentVersion
        ? `V${parseInt(currentVersion.slice(1)) + 1}`
        : 'V1';

      await promptRepo.createVersion(
        randomUUID(),
        id,
        versionNumber,
        { ...existing, ...fields, id, user_id: existing.user_id },
      );

      log.info('模板更新并生成新版本', { templateId: id, version: versionNumber });

      res.json({ data: { id, version: versionNumber } });
    } catch (err) {
      log.error('更新模板失败', { error: err });
      res.status(500).json({
        error: { code: 'UNKNOWN_ERROR', message: '更新模板失败' },
      });
    }
  });

  // ── DELETE /api/prompt/templates/:id ─────────────────
  /**
   * @swagger
   * /api/prompt/templates/{id}:
   *   delete:
   *     summary: 删除模板及其所有版本
   *     tags: [Prompt管理]
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
  router.delete('/templates/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const existing = await promptRepo.findTemplateById(id);
      if (!existing) {
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: '模板不存在' },
        });
        return;
      }

      await promptRepo.deleteTemplate(id);
      res.json({ data: { deleted: true } });
    } catch (err) {
      log.error('删除模板失败', { error: err });
      res.status(500).json({
        error: { code: 'UNKNOWN_ERROR', message: '删除模板失败' },
      });
    }
  });

  // ── GET /api/prompt/versions/:promptId ────────────────
  /**
   * @swagger
   * /api/prompt/versions/{promptId}:
   *   get:
   *     summary: 获取模板的版本列表
   *     tags: [Prompt管理]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: promptId
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: 版本列表
   */
  router.get('/versions/:promptId', async (req: Request, res: Response) => {
    try {
      const promptId = req.params.promptId as string;
      const versions = await promptRepo.listVersions(promptId);
      res.json({ data: versions });
    } catch (err) {
      log.error('获取版本列表失败', { error: err });
      res.status(500).json({
        error: { code: 'UNKNOWN_ERROR', message: '获取版本列表失败' },
      });
    }
  });

  return router;
}
