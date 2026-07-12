/**
 * server/utils/errors.ts — 全局异常类族
 *
 * 设计原则：
 * - 所有业务异常继承自 AppError，携带 HTTP 状态码 + 错误码
 * - 路由/中间件抛出 AppError 子类，由全局错误中间件统一捕获
 * - 禁止在路由中直接 res.status().json() 返回错误
 *
 * 使用示例：
 *   throw new ValidationError('用户名至少 2 个字符');
 *   throw new AuthError('用户名或密码错误');
 *   throw new ForbiddenError('无权操作其他管理员');
 */

import type { FieldError } from './response.js';

// ── 错误码常量 ──────────────────────────────────────────
export const ErrorCode = {
  INPUT_ERROR: 'INPUT_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  PROMPT_ERROR: 'PROMPT_ERROR',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
  VALIDATE_ERROR: 'VALIDATE_ERROR',
  DTO_ERROR: 'DTO_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// ── 基类 ────────────────────────────────────────────────
export class AppError extends Error {
  /** HTTP 状态码（200/400/401/403/404/409/429/500/502） */
  readonly statusCode: number;
  /** 业务错误码（与前端对齐） */
  readonly code: string;
  /** 字段级校验错误（仅 ValidationError 使用） */
  readonly fieldErrors?: FieldError[];
  /** 原始错误（用于日志，不暴露给客户端） */
  readonly cause?: unknown;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    opts?: { cause?: unknown; fieldErrors?: FieldError[] },
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.fieldErrors = opts?.fieldErrors;
    this.cause = opts?.cause;

    // 确保 instanceof 在 TS target < ES2015 时正常工作
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ── 具体异常类 ──────────────────────────────────────────

/** 400 — 客户端输入错误（参数缺失/格式不合法） */
export class ValidationError extends AppError {
  constructor(message: string, fieldErrors?: FieldError[]) {
    super(400, ErrorCode.INPUT_ERROR, message, { fieldErrors });
    this.name = 'ValidationError';
  }
}

/** 401 — 未认证（Token 缺失/无效/过期） */
export class AuthError extends AppError {
  constructor(message: string) {
    super(401, ErrorCode.UNAUTHORIZED, message);
    this.name = 'AuthError';
  }
}

/** 403 — 权限不足 */
export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(403, ErrorCode.FORBIDDEN, message);
    this.name = 'ForbiddenError';
  }
}

/** 404 — 资源不存在 */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, ErrorCode.NOT_FOUND, message);
    this.name = 'NotFoundError';
  }
}

/** 409 — 资源冲突（如用户名已存在） */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, ErrorCode.CONFLICT, message);
    this.name = 'ConflictError';
  }
}

/** 429 — 请求过于频繁 */
export class RateLimitError extends AppError {
  constructor(message: string) {
    super(429, ErrorCode.RATE_LIMITED, message);
    this.name = 'RateLimitError';
  }
}

// ── Workflow 专用异常 ──────────────────────────────────

/** Workflow 节点执行失败。node 标识失败的节点名。 */
export class WorkflowError extends AppError {
  readonly node: string;

  constructor(
    code: string,
    message: string,
    node: string,
    opts?: { cause?: unknown },
  ) {
    // 根据错误码映射 HTTP 状态码
    const statusMap: Record<string, number> = {
      [ErrorCode.INPUT_ERROR]: 400,
      [ErrorCode.PROMPT_ERROR]: 500,
      [ErrorCode.PROVIDER_ERROR]: 502,
      [ErrorCode.PARSE_ERROR]: 500,
      [ErrorCode.VALIDATE_ERROR]: 500,
      [ErrorCode.DTO_ERROR]: 500,
      [ErrorCode.UNKNOWN_ERROR]: 500,
    };
    super(statusMap[code] ?? 500, code, message, opts);
    this.name = 'WorkflowError';
    this.node = node;
  }
}

// ── 类型守卫 ────────────────────────────────────────────

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
