/**
 * server/workflow/nodes/parse.ts — Parse Node
 *
 * 职责：解析 AI 原始 JSON 输出为 Content 对象。
 * JSON 格式错误 → PARSE_ERROR，不触发重试。
 */

import type { WorkflowContext, WorkflowError, Content, Title, Page, Cover } from '../../types.js';

/**
 * 解析 AI 原始输出为 Content。
 * 仅做 JSON 解析，不验证 Content 结构完整性和字段合规性（交给 Validate Node）。
 */
export async function parseNode(ctx: WorkflowContext): Promise<WorkflowContext> {
  ctx.currentNode = 'parse';

  if (!ctx.rawResponse) {
    const err: WorkflowError = {
      code: 'PARSE_ERROR',
      message: 'rawResponse 为空，Provider Node 可能未执行',
      node: 'parse',
      timestamp: new Date().toISOString(),
    };
    throw Object.assign(new Error(err.message), { workflowError: err });
  }

  let parsed: Record<string, unknown>;

  try {
    // 尝试从响应中提取 JSON（AI 可能包裹在 markdown 代码块中）
    let jsonStr = ctx.rawResponse.trim();

    // 去除可能的 markdown 代码块包裹
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1]!.trim();
    }

    parsed = JSON.parse(jsonStr) as Record<string, unknown>;
  } catch (err) {
    const workflowError: WorkflowError = {
      code: 'PARSE_ERROR',
      message: `AI 输出无法解析为 JSON: ${(err as Error).message}`,
      node: 'parse',
      timestamp: new Date().toISOString(),
    };
    throw Object.assign(new Error(workflowError.message), { workflowError });
  }

  // 构建 Content 对象
  const content: Content = {
    id: '', // DTO Node 会分配
    topic: ctx.input.topic,
    platform: ctx.input.platform,
    titles: (parsed.titles as Title[]) || [],
    cover: (parsed.cover as Cover) || { title: ctx.input.topic },
    pages: (parsed.pages as Page[]) || [],
    tags: (parsed.tags as string[]) || [],
    summary: (parsed.summary as string) || '',
    extraRequirements: ctx.input.extraRequirements,
    metadata: {
      promptId: ctx.input.promptId || 'unknown',
      promptVersion: 'V1',
      model: ctx.input.provider,
      platform: ctx.input.platform,
      createdAt: new Date().toISOString(),
    },
  };

  return { ...ctx, parsedContent: content };
}
