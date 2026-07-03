/**
 * Workflow Engine — 系统唯一业务入口
 *
 * 负责串联 Input → Prompt → Provider → Parse → DTO → Output 全流程。
 * 保持无状态（Stateless），每次执行创建新的 WorkflowContext。
 */

import type {
  WorkflowInput,
  WorkflowResult,
  WorkflowContext,
  WorkflowNodeType,
  Content,
} from '@/types';
import { createWorkflowContext } from '@/models';
import { buildFinalPrompt } from '@/prompt/builder';
import { callProvider } from '@/providers';
import { parseContent } from '@/parser';
import { MAX_RETRY_COUNT } from '@/constants';

function generateWorkflowId(): string {
  return `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function recordTiming(ctx: WorkflowContext, node: WorkflowNodeType, startTime: number): void {
  ctx.nodeTimings[node] = Date.now() - startTime;
}

async function executeNode(
  ctx: WorkflowContext,
  node: WorkflowNodeType,
  fn: () => Promise<void>,
): Promise<void> {
  const startTime = Date.now();
  try {
    await fn();
  } finally {
    recordTiming(ctx, node, startTime);
  }
}

/**
 * 执行完整的内容生成 Workflow
 */
export async function generateContent(input: WorkflowInput): Promise<WorkflowResult> {
  const ctx = createWorkflowContext(generateWorkflowId());
  ctx.input = input;

  try {
    // 1. Input Node — 参数校验
    await executeNode(ctx, 'input', async () => {
      if (!input.topic || input.topic.trim().length === 0) {
        throw Object.assign(new Error('主题不能为空'), {
          code: 'INPUT_ERROR',
          node: 'input',
        });
      }
      if (!input.platform) {
        throw Object.assign(new Error('平台不能为空'), {
          code: 'INPUT_ERROR',
          node: 'input',
        });
      }
    });

    // 2. Prompt Node — 构建最终 Prompt
    await executeNode(ctx, 'prompt', async () => {
      ctx.finalPrompt = await buildFinalPrompt(input);
    });

    // 3. Provider Node — 调用 AI（支持重试）
    await executeNode(ctx, 'provider', async () => {
      let lastError: unknown;

      for (let attempt = 0; attempt < MAX_RETRY_COUNT; attempt++) {
        try {
          if (!ctx.finalPrompt) {
            throw Object.assign(new Error('FinalPrompt 未构建'), {
              code: 'PROMPT_ERROR',
              node: 'provider',
            });
          }
          ctx.rawResponse = await callProvider(ctx.finalPrompt);
          return; // 成功，退出重试
        } catch (err) {
          lastError = err;
          if (attempt < MAX_RETRY_COUNT - 1) {
            // 等待后重试
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          }
        }
      }

      throw Object.assign(lastError ?? new Error('Provider 调用失败'), {
        node: 'provider',
      });
    });

    // 4. Parse Node — 解析为 Content DTO
    await executeNode(ctx, 'parse', async () => {
      if (!ctx.rawResponse) {
        throw Object.assign(new Error('AI 未返回内容'), {
          code: 'PARSE_ERROR',
          node: 'parse',
        });
      }
      ctx.content = parseContent(ctx.rawResponse, input);
    });

    // 5. DTO Node — 注入 Metadata
    await executeNode(ctx, 'dto', async () => {
      if (!ctx.content) {
        throw Object.assign(new Error('Content DTO 构建失败'), {
          code: 'DTO_ERROR',
          node: 'dto',
        });
      }
      // Metadata 已在 parseContent 中注入，此处做最终校验
    });

    // 6. Output Node — 返回结果
    await executeNode(ctx, 'output', async () => {
      // 输出分发由调用方处理（Store / Editor / Exporter）
    });

    return {
      success: true,
      content: ctx.content as Content,
      workflowId: ctx.workflowId,
    };
  } catch (err) {
    const error = err as { code?: string; message?: string; node?: string };
    return {
      success: false,
      error: {
        code: error.code ?? 'UNKNOWN_ERROR',
        message: error.message ?? '未知错误',
        node: (error.node as WorkflowNodeType) ?? 'input',
        timestamp: new Date().toISOString(),
        detail: err,
      },
      workflowId: ctx.workflowId,
    };
  }
}
