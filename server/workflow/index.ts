/**
 * server/workflow/index.ts — Workflow 引擎入口
 *
 * 唯一业务编排中心。串联 7 节点 Pipeline：
 *   Input → Prompt → Provider → Parse → Validate → DTO → Output
 *
 * Validate 失败时支持重试（最多 3 次），将失败原因注入 userPrompt。
 */

import { randomUUID } from 'node:crypto';
import type { WorkflowContext, WorkflowInput, Content, WorkflowError } from '../types.js';
import { inputNode } from './nodes/input.js';
import { promptNode } from './nodes/prompt.js';
import { providerNode } from './nodes/provider.js';
import { parseNode } from './nodes/parse.js';
import { validateNode } from './nodes/validate.js';
import { dtoNode } from './nodes/dto.js';
import { outputNode } from './nodes/output.js';

const MAX_VALIDATE_RETRIES = 3;

/**
 * 创建初始 Workflow 上下文。
 */
function createContext(input: WorkflowInput): WorkflowContext {
  return {
    traceId: randomUUID(),
    input,
    currentNode: 'input',
  };
}

/**
 * 执行完整 Workflow Pipeline。
 * 返回最终 Content DTO 或抛出 WorkflowError。
 */
export async function executeWorkflow(input: WorkflowInput): Promise<Content> {
  let ctx = createContext(input);

  // ── 1. Input ──────────────────────────────────────────
  ctx = await inputNode(ctx);

  // ── 2. Prompt ─────────────────────────────────────────
  ctx = await promptNode(ctx);

  // ── 3-6. Provider → Parse → Validate（含重试）────────
  let validateRetries = 0;

  while (validateRetries <= MAX_VALIDATE_RETRIES) {
    // 3. Provider
    ctx = await providerNode(ctx);

    // 4. Parse
    ctx = await parseNode(ctx);

    // 5. Validate
    try {
      ctx = await validateNode(ctx);
      break; // 校验通过，跳出重试循环
    } catch (err) {
      const wfErr = (err as { workflowError?: WorkflowError }).workflowError;
      if (wfErr?.code === 'VALIDATE_ERROR') {
        validateRetries++;
        if (validateRetries > MAX_VALIDATE_RETRIES) {
          // 重试耗尽，向上抛出
          throw err;
        }
        // 将失败原因注入 userPrompt，让 AI 修正
        if (ctx.finalPrompt) {
          ctx.finalPrompt = {
            ...ctx.finalPrompt,
            userPrompt:
              ctx.finalPrompt.userPrompt +
              `\n\n【上次生成的内容校验未通过，请修正：】\n${wfErr.message}\n\n请重新生成符合要求的 JSON。`,
          };
        }
        continue;
      }
      // 非 VALIDATE_ERROR，直接抛出
      throw err;
    }
  }

  // ── 6. DTO ────────────────────────────────────────────
  ctx = await dtoNode(ctx);

  // ── 7. Output ─────────────────────────────────────────
  ctx = await outputNode(ctx);

  return ctx.output!;
}

/**
 * 将 WorkflowError 格式的错误提取出来。
 */
export function extractWorkflowError(err: unknown): WorkflowError {
  const wfErr = (err as { workflowError?: WorkflowError }).workflowError;
  if (wfErr) return wfErr;

  return {
    code: 'UNKNOWN_ERROR',
    message: err instanceof Error ? err.message : String(err),
    node: 'unknown',
    timestamp: new Date().toISOString(),
    detail: String(err),
  };
}
