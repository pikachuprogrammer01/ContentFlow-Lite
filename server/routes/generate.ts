/**
 * server/routes/generate.ts — AI 内容生成路由
 *
 * POST /api/generate   — 触发 Workflow 生成内容
 *
 * 必须认证。受 generateLimiter 限流（10 次/分钟/用户）。
 * 错误通过 throw 抛出，由全局 error-handler 统一处理。
 */

import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { authMiddleware } from '../middleware/auth.js';
import { generateLimiter } from '../middleware/rate-limit.js';
import { asyncHandler, extractWorkflowError } from '../middleware/error-handler.js';
import { executeWorkflow } from '../workflow/index.js';
import * as generationRepo from '../db/repositories/generation-repo.js';
import * as contentRepo from '../db/repositories/content-repo.js';
import { createLogger } from '../utils/logger.js';
import { success } from '../utils/response.js';
import { ValidationError, WorkflowError, ErrorCode } from '../utils/errors.js';
import type { WorkflowInput, GenerateRequest } from '../types.js';

const log = createLogger('routes/generate');

export function createGenerateRouter(): Router {
  const router = Router();

  // ── POST /api/generate ─────────────────────────────────
  router.post(
    '/',
    authMiddleware,
    generateLimiter,
    asyncHandler(async (req: Request, res: Response) => {
      const startTime = Date.now();

      const { topic, platform, provider, extraRequirements, promptId } =
        req.body as GenerateRequest;

      // 参数校验
      if (!topic || !platform || !provider) {
        throw new ValidationError('topic、platform、provider 不能为空');
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
      let content;
      try {
        content = await executeWorkflow(workflowInput);
      } catch (err) {
        // 尝试提取结构化 WorkflowError
        const wfErr = extractWorkflowError(err);
        if (wfErr) {
          throw wfErr; // 全局 error-handler 统一处理
        }
        // 不可识别的错误 → 包装后抛出
        throw new WorkflowError(
          ErrorCode.UNKNOWN_ERROR,
          err instanceof Error ? err.message : 'Workflow 执行失败',
          'unknown',
          { cause: err },
        );
      }

      // 保存 Content DTO 到数据库（失败不影响返回值）
      try {
        await contentRepo.save(req.user!.userId, content);
      } catch (saveErr) {
        log.warn('Content 保存失败（不影响返回值）', { error: String(saveErr) });
      }

      // 记录生成记录（失败不影响返回值）
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

      res.json(success(content, '生成成功'));
    }),
  );

  return router;
}
