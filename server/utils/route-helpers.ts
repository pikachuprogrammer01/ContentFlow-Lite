/**
 * server/utils/route-helpers.ts — 路由层公共工具
 *
 * 减少 admin / prompt 路由中的重复代码（分页解析、响应包装、批量校验、错误处理）。
 */

import type { Response } from 'express';

/** 模块 Logger 接口（与 createLogger 返回值对齐） */
export interface ModuleLogger {
  error: (msg: string, detail?: Record<string, unknown>) => void;
  warn: (msg: string, detail?: Record<string, unknown>) => void;
  info: (msg: string, detail?: Record<string, unknown>) => void;
  debug: (msg: string, detail?: Record<string, unknown>) => void;
  trace: (msg: string, detail?: Record<string, unknown>) => void;
}

// ══════════════════════════════════════════════════════════════
// 分页
// ══════════════════════════════════════════════════════════════

export interface PaginationMeta {
  page: number;
  limit: number;
  offset: number;
}

/** 从 query 中解析 page / limit，做边界保护 */
export function parsePagination(query: Record<string, unknown>): PaginationMeta {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string, 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

export interface PagedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** 包装分页响应 */
export function wrapPagination<T>(items: T[], total: number, meta: PaginationMeta): PagedResult<T> {
  return {
    items,
    pagination: {
      page: meta.page,
      limit: meta.limit,
      total,
      totalPages: Math.ceil(total / meta.limit),
    },
  };
}

// ══════════════════════════════════════════════════════════════
// 批量
// ══════════════════════════════════════════════════════════════

export const MAX_BATCH_IDS = 100;

/** 校验 ids 数组，不符合时直接响应 400 并返回 false */
export function validateBatchIds(res: Response, body: unknown): string[] | null {
  const { ids } = body as Record<string, unknown>;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_BATCH_IDS) {
    res.status(400).json({
      error: {
        code: 'INPUT_ERROR',
        message: `ids 必须是非空数组，最多 ${MAX_BATCH_IDS} 条`,
      },
    });
    return null;
  }
  return ids as string[];
}

// ══════════════════════════════════════════════════════════════
// 错误处理
// ══════════════════════════════════════════════════════════════

/** 标准化路由错误处理：记录日志 + 500 响应 */
export function handleError(res: Response, log: ModuleLogger, operation: string, err: unknown): void {
  log.error(`${operation} 失败`, { error: String(err) });
  res.status(500).json({
    error: {
      code: 'UNKNOWN_ERROR',
      message: `${operation}失败`,
    },
  });
}
