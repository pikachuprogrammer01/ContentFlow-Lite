/**
 * server/workflow/nodes/dto.ts — DTO Node
 *
 * 职责：统一封装 Content DTO，分配 ID，注入 Metadata。
 */

import { randomUUID } from 'node:crypto';
import type { WorkflowContext, WorkflowError, Content } from '../../types.js';

/**
 * 组装最终 Content DTO。
 * 分配 ID，注入完整 Metadata。
 */
export async function dtoNode(ctx: WorkflowContext): Promise<WorkflowContext> {
  ctx.currentNode = 'dto';

  if (!ctx.parsedContent) {
    const err: WorkflowError = {
      code: 'DTO_ERROR',
      message: 'parsedContent 为空，Parse/Validate Node 可能未执行',
      node: 'dto',
      timestamp: new Date().toISOString(),
    };
    throw Object.assign(new Error(err.message), { workflowError: err });
  }

  const content: Content = {
    ...ctx.parsedContent,
    id: randomUUID(),
    metadata: {
      ...ctx.parsedContent.metadata,
      promptId: ctx.input.promptId || 'unknown',
      model: ctx.input.provider,
      platform: ctx.input.platform,
      createdAt: new Date().toISOString(),
    },
  };

  return { ...ctx, output: content };
}
