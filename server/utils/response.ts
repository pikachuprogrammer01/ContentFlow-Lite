/**
 * server/utils/response.ts — 统一响应工具
 *
 * 所有 API 响应必须通过本模块的工厂函数构建，禁止直接拼接 JSON。
 *
 * 成功信封：{ code: <HTTP 数字>, data: <数据>, message: "<描述>" }
 * 错误信封：{ code: "<错误码>", error?: { data: [...] }, message: "<描述>" }
 */

/** 字段级校验错误 */
export interface FieldError {
  field: string;
  message: string;
}

/** 成功响应 Object */
export interface SuccessBody<T = unknown> {
  code: number;
  data: T;
  message: string;
}

/** 错误响应 Object */
export interface FailBody {
  code: string;
  message: string;
  error?: { data: FieldError[] };
}

/**
 * 通用成功响应。
 * @param data  响应数据
 * @param message 中文描述，默认「操作成功」
 */
export function success<T = unknown>(data: T, message = '操作成功'): SuccessBody<T> {
  return { code: 200, data, message };
}

/**
 * 创建成功响应（HTTP 201）。
 * @param data  响应数据（通常为 { id } 或 { id, version }）
 * @param message 中文描述，默认「创建成功」
 */
export function created<T = unknown>(data: T, message = '创建成功'): SuccessBody<T> {
  return { code: 201, data, message };
}

/**
 * 通用错误响应。
 * @param code    错误码，如 INPUT_ERROR / UNAUTHORIZED / FORBIDDEN / NOT_FOUND / CONFLICT / RATE_LIMITED / UNKNOWN_ERROR
 * @param message 中文描述
 * @param errors  字段级校验错误列表（仅 INPUT_ERROR 传入）
 */
export function fail(code: string, message: string, errors?: FieldError[]): FailBody {
  const body: FailBody = { code, message };
  if (errors && errors.length > 0) {
    body.error = { data: errors };
  }
  return body;
}
