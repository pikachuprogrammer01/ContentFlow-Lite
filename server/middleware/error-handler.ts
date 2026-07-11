/**
 * server/middleware/error-handler.ts — 全局异常处理中间件
 *
 * Express 4-arg 错误处理中间件，捕获所有路由/中间件抛出的异常：
 * - AppError 子类 → 对应的 HTTP 状态码 + 业务错误码
 * - 未知 Error → 500 + UNKNOWN_ERROR（不暴露调用栈）
 * - 非 Error 值 → 500 + UNKNOWN_ERROR（防御性处理）
 *
 * 配套工具：
 * - `asyncHandler(fn)` — 包装异步路由 handler，自动捕获 Promise rejection
 * - `extractWorkflowError(err)` — 从 Workflow 引擎的链式错误中提取 WorkflowError
 */

import type { Request, Response, NextFunction } from 'express';
import {
  isAppError,
  WorkflowError,
  ErrorCode,
} from '../utils/errors.js';
import { fail } from '../utils/response.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('error-handler');

// ── 异步 Handler 包装器 ─────────────────────────────────

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

/**
 * 包装异步路由 handler，自动捕获 rejected Promise 并转入 next(err)。
 *
 * 用法：
 *   router.get('/path', asyncHandler(async (req, res) => {
 *     throw new NotFoundError('用户不存在');
 *   }));
 */
export function asyncHandler(fn: AsyncRequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ── WorkflowError 提取 ──────────────────────────────────

/**
 * 从 Workflow 引擎抛出的链式 Error 中提取结构化 WorkflowError。
 * Workflow 各节点的错误通过 non-standard 属性挂载，此函数负责解包。
 *
 * @returns 提取成功则返回 WorkflowError，否则返回 null
 */
export function extractWorkflowError(err: unknown): WorkflowError | null {
  if (err instanceof WorkflowError) {
    return err;
  }

  // 兼容旧代码：检查 non-standard .workflowError 属性
  const we = (err as Record<string, unknown> | null | undefined)
    ?.workflowError;
  if (we && typeof we === 'object') {
    const w = we as { code?: string; message?: string; node?: string };
    if (w.code && w.message && w.node) {
      return new WorkflowError(w.code, w.message, w.node);
    }
  }

  return null;
}

// ── 全局错误处理中间件 ──────────────────────────────────

export function globalErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // 已发送过响应头则委托给 Express 默认处理
  if (res.headersSent) {
    return;
  }

  // ── AppError 子类 ──
  if (isAppError(err)) {
    log.error(err.message, {
      code: err.code,
      statusCode: err.statusCode,
      node: err instanceof WorkflowError ? err.node : undefined,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    });

    res.status(err.statusCode).json(fail(err.code, err.message, err.fieldErrors));
    return;
  }

  // ── 普通 Error ──
  if (err instanceof Error) {
    log.error(err.message, {
      code: ErrorCode.UNKNOWN_ERROR,
      stack: err.stack,
    });

    res.status(500).json(
      fail(ErrorCode.UNKNOWN_ERROR, process.env.NODE_ENV === 'production'
        ? '服务器内部错误'
        : `服务器内部错误: ${err.message}`,
      ),
    );
    return;
  }

  // ── 防御：未知类型 ──
  log.error('未知类型的错误被抛出', { error: String(err) });
  res.status(500).json(fail(ErrorCode.UNKNOWN_ERROR, '服务器内部错误'));
}
