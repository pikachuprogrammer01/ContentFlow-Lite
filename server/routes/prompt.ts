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
 * 统一使用 throw AppError + asyncHandler 模式，由全局 error handler 处理。
 */

import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error-handler.js';
import * as promptRepo from '../db/repositories/prompt-repo.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { success, created } from '../utils/response.js';
import type { PromptTemplateRow } from '../types.js';

export function createPromptRouter(): Router {
  const router = Router();

  router.use(authMiddleware);

  // ── GET /api/prompt/templates ────────────────────────
  router.get('/templates', asyncHandler(async (req: Request, res: Response) => {
    const templates = await promptRepo.listTemplates(req.user!.userId);
    res.json(success(templates));
  }));

  // ── GET /api/prompt/templates/:id ────────────────────
  router.get('/templates/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const template = await promptRepo.findTemplateById(id);
    if (!template) {
      throw new NotFoundError('模板不存在');
    }
    res.json(success(template));
  }));

  // ── POST /api/prompt/templates ───────────────────────
  router.post('/templates', asyncHandler(async (req: Request, res: Response) => {
    const { name, type, platform, systemPrompt, userPrompt, isDefault } = req.body;

    if (!name || !type || !platform || !systemPrompt || !userPrompt) {
      throw new ValidationError('缺少必填字段：name、type、platform、systemPrompt、userPrompt');
    }

    if (!['text', 'image'].includes(type)) {
      throw new ValidationError('type 只能是 text 或 image');
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

    res.status(201).json(created({ id }));
  }));

  // ── PUT /api/prompt/templates/:id ────────────────────
  router.put('/templates/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const existing = await promptRepo.findTemplateById(id);
    if (!existing) {
      throw new NotFoundError('模板不存在');
    }

    const { name, platform, systemPrompt, userPrompt, isDefault } = req.body;

    const fields: Partial<Pick<PromptTemplateRow, 'name' | 'system_prompt' | 'user_prompt' | 'is_default' | 'platform'>> = {};
    if (name !== undefined) fields.name = name;
    if (platform !== undefined) fields.platform = platform;
    if (systemPrompt !== undefined) fields.system_prompt = systemPrompt;
    if (userPrompt !== undefined) fields.user_prompt = userPrompt;
    if (isDefault !== undefined) fields.is_default = isDefault ? 1 : 0;

    if (Object.keys(fields).length > 0) {
      await promptRepo.updateTemplate(id, fields);
    }

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

    res.json(success({ id, version: versionNumber }));
  }));

  // ── DELETE /api/prompt/templates/:id ─────────────────
  router.delete('/templates/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const existing = await promptRepo.findTemplateById(id);
    if (!existing) {
      throw new NotFoundError('模板不存在');
    }

    await promptRepo.deleteTemplate(id);
    res.json(success({ deleted: true }));
  }));

  // ── GET /api/prompt/versions/:promptId ────────────────
  router.get('/versions/:promptId', asyncHandler(async (req: Request, res: Response) => {
    const promptId = req.params.promptId as string;
    const versions = await promptRepo.listVersions(promptId);
    res.json(success(versions));
  }));

  return router;
}
