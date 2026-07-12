/**
 * server/workflow/nodes/output.ts — Output Node
 *
 * 职责：最终输出 Content DTO。Pipeline 最后一个节点。
 */

import type { WorkflowContext, WorkflowError } from '../../types.js';

/**
 * 返回最终 Content DTO。
 */
export async function outputNode(ctx: WorkflowContext): Promise<WorkflowContext> {
  ctx.currentNode = 'output';

  if (!ctx.output) {
    const err: WorkflowError = {
      code: 'DTO_ERROR',
      message: 'output 为空，DTO Node 可能未执行',
      node: 'output',
      timestamp: new Date().toISOString(),
    };
    throw Object.assign(new Error(err.message), { workflowError: err });
  }

  return ctx;
}
