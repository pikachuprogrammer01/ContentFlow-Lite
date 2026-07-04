/**
 * server/routes/generate.ts — AI 内容生成路由
 *
 * POST /api/generate   — 触发 Workflow 生成内容
 *
 * 必须认证。受 generateLimiter 限流（10 次/分钟/用户）。
 */

import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { authMiddleware } from '../middleware/auth.js';
import { generateLimiter } from '../middleware/rate-limit.js';
import { executeWorkflow, extractWorkflowError } from '../workflow/index.js';
import * as generationRepo from '../db/repositories/generation-repo.js';
import * as contentRepo from '../db/repositories/content-repo.js';
import { createLogger } from '../utils/logger.js';
import type { WorkflowInput, GenerateRequest } from '../types.js';

const log = createLogger('routes/generate');

export function createGenerateRouter(): Router {
  const router = Router();

  // ── POST /api/generate ─────────────────────────────────
  router.post('/', authMiddleware, generateLimiter, async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      const { topic, platform, provider, extraRequirements, promptId } =
        req.body as GenerateRequest;

      // 参数校验
      if (!topic || !platform || !provider) {
        res.status(400).json({
          error: {
            code: 'INPUT_ERROR',
            message: 'topic、platform、provider 不能为空',
          },
        });
        return;
      }

      // 构建 Workflow 输入
      const workflowInput: WorkflowInput = {
        topic,
        platform,
        provider,
        extraRequirements,
        promptId,
        userId: req.user!.userId,
      };

      log.info('Workflow 开始执行', {
        traceId: 'gen-' + Date.now(),
        topic,
        platform,
        provider,
        userId: req.user!.userId,
      });

      // 执行 Workflow Pipeline
      const content = await executeWorkflow(workflowInput);

      // 保存 Content DTO 到数据库
      try {
        await contentRepo.save(req.user!.userId, content);
      } catch (saveErr) {
        log.warn('Content 保存失败（不影响返回值）', { error: String(saveErr) });
      }

      // 记录生成记录
      try {
        await generationRepo.record({
          id: randomUUID(),
          userId: req.user!.userId,
          contentId: content.id,
          topic,
          platform,
          promptId: content.metadata.promptId,
          promptVersion: content.metadata.promptVersion,
          model: provider,
        });
      } catch (recordErr) {
        log.warn('生成记录写入失败（不影响返回值）', { error: String(recordErr) });
      }

      const duration = Date.now() - startTime;
      log.info('Workflow 执行成功', {
        duration,
        contentId: content.id,
        pagesCount: String(content.pages.length),
      });

      res.json({ content });
    } catch (err) {
      const workflowError = extractWorkflowError(err);
      const duration = Date.now() - startTime;

      log.error('Workflow 执行失败', {
        code: workflowError.code,
        node: workflowError.node,
        duration,
        error: workflowError.message,
      });

      // 映射 WorkflowError.code 到 HTTP 状态码
      const statusMap: Record<string, number> = {
        INPUT_ERROR: 400,
        PROMPT_ERROR: 500,
        PROVIDER_ERROR: 502,
        PARSE_ERROR: 500,
        VALIDATE_ERROR: 500,
        DTO_ERROR: 500,
        UNKNOWN_ERROR: 500,
      };

      res.status(statusMap[workflowError.code] || 500).json({
        error: {
          code: workflowError.code,
          message: workflowError.message,
          node: workflowError.node,
        },
      });
    }
  });

  return router;
}
