/**
 * server/workflow/nodes/prompt.ts — Prompt Node
 *
 * 职责：构建 FinalPrompt。
 *   1. 查找用户对该平台的默认 Prompt 模板
 *   2. 替换变量构建 userPrompt
 *   3. 注入 promptId + version 到 context
 */

import type { WorkflowContext, WorkflowError } from '../../types.js';
import * as promptRepo from '../../db/repositories/prompt-repo.js';

const DEFAULT_SYSTEM_PROMPT = '你是一个专业的中文内容创作者，擅长撰写社交媒体文案。';

const DEFAULT_USER_PROMPT = `请根据以下主题生成一篇小红书图文内容：

主题：{{topic}}
{{extraRequirements}}

要求：
1. 生成 1 个吸引人的标题
2. 生成 5 页正文内容
3. 每页文字简洁有力，适合配图
4. 标签 4-6 个
5. 以 JSON 格式输出，结构为：
{
  "titles": [{ "id": "t1", "text": "标题文本", "type": "main" }],
  "cover": { "title": "封面标题", "subtitle": "封面副标题" },
  "pages": [{ "id": "p1", "order": 1, "text": "正文内容" }],
  "tags": ["标签1", "标签2"],
  "summary": "内容摘要"
}`;

/**
 * 构建 FinalPrompt。
 * 优先使用用户的默认模板，否则使用内置默认。
 */
export async function promptNode(ctx: WorkflowContext): Promise<WorkflowContext> {
  ctx.currentNode = 'prompt';

  const { topic, platform, userId, promptId, extraRequirements } = ctx.input;

  let finalPrompt;
  let templateId = 'builtin';

  try {
    // 尝试加载用户的默认模板
    const template = promptId
      ? await promptRepo.findTemplateById(promptId)
      : await promptRepo.findDefaultTextPrompt(userId, platform);

    if (template) {
      templateId = template.id;

      finalPrompt = promptRepo.buildFinalPrompt(template, {
        topic,
        platform,
        extraRequirements: extraRequirements || '',
      });
    } else {
      // 使用内置默认
      finalPrompt = promptRepo.buildFinalPrompt(
        {
          id: 'builtin',
          user_id: 'system',
          name: '默认模板',
          type: 'text',
          is_default: 1,
          platform,
          system_prompt: DEFAULT_SYSTEM_PROMPT,
          user_prompt: DEFAULT_USER_PROMPT,
          created_at: '',
          updated_at: '',
        },
        {
          topic,
          platform,
          extraRequirements: extraRequirements || '无',
        },
      );
    }
  } catch (err) {
    const workflowError: WorkflowError = {
      code: 'PROMPT_ERROR',
      message: `Prompt 构建失败: ${(err as Error).message}`,
      node: 'prompt',
      timestamp: new Date().toISOString(),
    };
    throw Object.assign(new Error(workflowError.message), { workflowError });
  }

  return {
    ...ctx,
    finalPrompt,
    input: {
      ...ctx.input,
      promptId: templateId,
    },
  };
}
