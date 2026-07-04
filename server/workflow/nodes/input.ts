/**
 * server/workflow/nodes/input.ts — Input Node
 *
 * 职责：校验用户输入参数，补全默认值。
 * Workflow Pipeline 第一阶段。
 */

import type { WorkflowContext, WorkflowError } from '../../types.js';

/**
 * 校验并标准化用户输入。
 * 必填字段缺失 → INPUT_ERROR
 * Provider 不存在 → INPUT_ERROR
 */
export async function inputNode(ctx: WorkflowContext): Promise<WorkflowContext> {
  ctx.currentNode = 'input';

  const { topic, platform, provider, extraRequirements, promptId } = ctx.input;

  // 必填字段校验
  if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
    const err: WorkflowError = {
      code: 'INPUT_ERROR',
      message: 'topic 不能为空',
      node: 'input',
      timestamp: new Date().toISOString(),
    };
    throw Object.assign(new Error(err.message), { workflowError: err });
  }

  if (!platform || typeof platform !== 'string') {
    const err: WorkflowError = {
      code: 'INPUT_ERROR',
      message: 'platform 不能为空',
      node: 'input',
      timestamp: new Date().toISOString(),
    };
    throw Object.assign(new Error(err.message), { workflowError: err });
  }

  if (!provider || typeof provider !== 'string') {
    const err: WorkflowError = {
      code: 'INPUT_ERROR',
      message: 'provider 不能为空',
      node: 'input',
      timestamp: new Date().toISOString(),
    };
    throw Object.assign(new Error(err.message), { workflowError: err });
  }

  // 标准化：trim topic，补全默认值
  return {
    ...ctx,
    input: {
      ...ctx.input,
      topic: topic.trim(),
      extraRequirements: extraRequirements || undefined,
      promptId: promptId || undefined,
    },
  };
}
