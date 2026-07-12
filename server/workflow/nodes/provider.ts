/**
 * server/workflow/nodes/provider.ts — Provider Node
 *
 * 职责：调用 AI Provider 获取原始文本响应。
 * 支持网络/模型错误重试（最多 3 次）。
 */

import type { WorkflowContext, WorkflowError } from '../../types.js';
import { getProvider } from '../../providers/index.js';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 3000]; // ms

/**
 * 调用 AI Provider。
 * 网络/模型错误时最多重试 3 次，间隔递增。
 */
export async function providerNode(ctx: WorkflowContext): Promise<WorkflowContext> {
  ctx.currentNode = 'provider';

  if (!ctx.finalPrompt) {
    const err: WorkflowError = {
      code: 'PROVIDER_ERROR',
      message: 'FinalPrompt 未构建，Prompt Node 可能未执行',
      node: 'provider',
      timestamp: new Date().toISOString(),
    };
    throw Object.assign(new Error(err.message), { workflowError: err });
  }

  const providerName = ctx.input.provider;
  const provider = getProvider(providerName);

  if (!provider) {
    const err: WorkflowError = {
      code: 'PROVIDER_ERROR',
      message: `Provider "${providerName}" 不存在，可用：mock, gemini, deepseek`,
      node: 'provider',
      timestamp: new Date().toISOString(),
    };
    throw Object.assign(new Error(err.message), { workflowError: err });
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const rawResponse = await provider.generate(ctx.finalPrompt);
      return { ...ctx, rawResponse };
    } catch (err) {
      lastError = err as Error;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]!));
      }
    }
  }

  const workflowError: WorkflowError = {
    code: 'PROVIDER_ERROR',
    message: `AI 调用失败（已重试 ${MAX_RETRIES} 次）: ${lastError?.message || '未知错误'}`,
    node: 'provider',
    timestamp: new Date().toISOString(),
    detail: { provider: providerName, retries: MAX_RETRIES },
  };
  throw Object.assign(new Error(workflowError.message), { workflowError });
}
