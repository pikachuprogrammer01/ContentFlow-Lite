/**
 * server/workflow/nodes/validate.ts — Validate Node
 *
 * 职责：用 OutputSchema 校验 Parse Node 产出的 Content 结构。
 *   通过 → 流入 DTO Node
 *   不通过 → 返回校验失败原因（由 Workflow 层执行重试逻辑）
 */

import type { WorkflowContext, WorkflowError, Content } from '../../types.js';

/** 默认 OutputSchema — 小红书/抖音等平台统一校验规则 */
const DEFAULT_SCHEMA = {
  required: ['titles', 'pages', 'tags'],
  properties: {
    titles: { type: 'array' as const, minItems: 1, items: { type: 'object' as const } },
    pages: { type: 'array' as const, minItems: 3, items: { type: 'object' as const } },
    tags: { type: 'array' as const, minItems: 2, items: { type: 'string' as const } },
    summary: { type: 'string' as const },
    cover: { type: 'object' as const },
  },
  minItems: { titles: 1, pages: 3, tags: 2 },
} as const;

/** 校验结果 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 校验 Content 结构是否符合 OutputSchema。
 * 返回 ValidationResult，不直接抛出异常（由 Workflow 层决定是否重试）。
 */
export async function validateNode(ctx: WorkflowContext): Promise<WorkflowContext> {
  ctx.currentNode = 'validate';

  if (!ctx.parsedContent) {
    const err: WorkflowError = {
      code: 'VALIDATE_ERROR',
      message: 'parsedContent 为空，Parse Node 可能未执行',
      node: 'validate',
      timestamp: new Date().toISOString(),
    };
    throw Object.assign(new Error(err.message), { workflowError: err });
  }

  const result = validateContent(ctx.parsedContent, DEFAULT_SCHEMA);

  if (!result.valid) {
    const err: WorkflowError = {
      code: 'VALIDATE_ERROR',
      message: `内容校验不通过:\n${result.errors.map((e) => `  - ${e}`).join('\n')}`,
      node: 'validate',
      timestamp: new Date().toISOString(),
      detail: { errors: result.errors },
    };
    throw Object.assign(new Error(err.message), { workflowError: err });
  }

  return ctx;
}

/**
 * 纯函数：验证 Content 是否符合 schema。
 */
export function validateContent(content: Content, schema: typeof DEFAULT_SCHEMA): ValidationResult {
  const errors: string[] = [];

  // 检查 required 字段
  for (const field of schema.required) {
    if (!(field in content) || content[field as keyof Content] == null) {
      errors.push(`缺少必填字段: ${field}`);
      continue;
    }

    const value = content[field as keyof Content];
    const fieldSchema = schema.properties[field];

    // 如果 schema 中有 minItems 配置则校验
    if (fieldSchema?.type === 'array' && Array.isArray(value)) {
      const minItems = schema.minItems?.[field];
      if (minItems != null && value.length < minItems) {
        errors.push(`${field} 数量不足（需要至少 ${minItems} 个，实际只有 ${value.length} 个）`);
      }
    }
  }

  // 检查 tags 类型
  if (content.tags && !Array.isArray(content.tags)) {
    errors.push('tags 字段类型错误（应该是数组）');
  }

  // 检查 pages 类型
  if (content.pages && !Array.isArray(content.pages)) {
    errors.push('pages 字段类型错误（应该是数组）');
  }

  // 检查 titles 类型
  if (content.titles && !Array.isArray(content.titles)) {
    errors.push('titles 字段类型错误（应该是数组）');
  }

  return { valid: errors.length === 0, errors };
}
