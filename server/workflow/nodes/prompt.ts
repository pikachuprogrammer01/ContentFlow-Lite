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

// ── 各平台默认 Prompt ──────────────────────────────────

interface PlatformPrompt {
  system: string;
  user: string;
}

const PLATFORM_PROMPTS: Record<string, PlatformPrompt> = {
  xiaohongshu: {
    system:
      '你是一个小红书资深博主，擅长撰写种草文案。风格亲切自然，善用 emoji 和网络热词，' +
      '多分段、短句、强互动感。',
    user: `请根据以下主题生成一篇小红书图文内容：

主题：{{topic}}
{{extraRequirements}}

要求：
1. 生成 2-3 个吸引人的标题（要有 emoji 和吸睛词）
2. 生成 5 页正文，每页文字简洁有力，适合配图
3. 标签 4-6 个（必须是热门话题标签）
4. 文末加上互动引导（点赞/收藏/评论）
5. 以 JSON 格式输出：
{
  "titles": [{ "id": "t1", "text": "标题", "type": "main" }],
  "cover": { "title": "封面大标题", "subtitle": "副标题" },
  "pages": [{ "id": "p1", "title": "页面标题", "content": "正文内容" }],
  "tags": ["标签1"],
  "summary": "50字以内摘要"
}`,
  },

  douyin: {
    system:
      '你是一个抖音短视频文案专家，擅长写短小精悍、高转化率的视频标题和描述。' +
      '风格口语化、节奏感强、前 3 秒钩子必须抓人。',
    user: `请根据以下主题生成抖音视频文案：

主题：{{topic}}
{{extraRequirements}}

要求：
1. 生成 3-5 个短视频标题（前3秒钩子 + 话题性）
2. 生成视频口播脚本，每段 20-30 秒可读完
3. 标签 5-8 个（热度高 + 长尾兼顾）
4. 以 JSON 格式输出：
{
  "titles": [{ "id": "t1", "text": "视频标题", "type": "main" }],
  "cover": { "title": "封面大字", "subtitle": "副标题" },
  "pages": [{ "id": "p1", "title": "段落标题", "content": "口播文案" }],
  "tags": ["标签1"],
  "summary": "一句话视频简介"
}`,
  },

  wechat: {
    system:
      '你是一个微信公众号资深编辑，擅长撰写深度内容。风格专业但不枯燥，善于用结构化的方式' +
      '组织长文，注重信息密度和可读性。',
    user: `请根据以下主题生成一篇公众号文章：

主题：{{topic}}
{{extraRequirements}}

要求：
1. 生成 1 个主标题 + 1 个副标题（要有信息量和点击欲）
2. 正文分 3-4 个小节，每节有小标题
3. 开头有引语，结尾有总结或互动
4. 以 JSON 格式输出：
{
  "titles": [{ "id": "t1", "text": "主标题", "type": "main" }, { "id": "t2", "text": "副标题", "type": "sub" }],
  "cover": { "title": "封面标题", "subtitle": "副标题" },
  "pages": [{ "id": "p1", "title": "小节标题", "content": "小节正文" }],
  "tags": ["标签1"],
  "summary": "100字以内摘要"
}`,
  },

  zhihu: {
    system:
      '你是一个知乎高赞答主，擅长写有深度、有逻辑、有干货的回答。风格理性客观，' +
      '善用数据、案例、分点论证。',
    user: `请根据以下主题生成一篇知乎回答/文章：

主题：{{topic}}
{{extraRequirements}}

要求：
1. 生成 1 个引人思考的标题（问题式或反常识式）
2. 正文有清晰的逻辑结构（观点→论据→案例→总结）
3. 使用分点、加粗、引用等格式增强可读性
4. 以 JSON 格式输出：
{
  "titles": [{ "id": "t1", "text": "标题", "type": "main" }],
  "cover": { "title": "标题", "subtitle": "副标题" },
  "pages": [{ "id": "p1", "title": "小节标题", "content": "正文" }],
  "tags": ["标签1"],
  "summary": "50字以内摘要"
}`,
  },

  bilibili: {
    system:
      '你是一个 B站 UP 主，擅长写视频简介和专栏。风格年轻化、有梗、社区感强，' +
      '善用 B站弹幕文化和网络流行语。',
    user: `请根据以下主题生成 B站视频/专栏文案：

主题：{{topic}}
{{extraRequirements}}

要求：
1. 生成 1 个标题（要能激起点击欲，可以用梗）
2. 正文有节奏感，适合配合视频画面
3. 标签 4-6 个（B站分区标签 + 热点标签）
4. 以 JSON 格式输出：
{
  "titles": [{ "id": "t1", "text": "标题", "type": "main" }],
  "cover": { "title": "封面标题", "subtitle": "副标题" },
  "pages": [{ "id": "p1", "title": "段落标题", "content": "文案内容" }],
  "tags": ["标签1"],
  "summary": "一句话简介"
}`,
  },

  toutiao: {
    system:
      '你是一个今日头条资深作者，擅长写新闻资讯和热点评论。风格简洁有力，' +
      '标题党但不失真实，前 50 字决定点击率。',
    user: `请根据以下主题生成一篇头条文章：

主题：{{topic}}
{{extraRequirements}}

要求：
1. 生成 1 个资讯类标题（要有信息量和新闻感）
2. 正文简明扼要，3-4 段，首段概述全篇
3. 标签 3-5 个
4. 以 JSON 格式输出：
{
  "titles": [{ "id": "t1", "text": "标题", "type": "main" }],
  "cover": { "title": "封面标题", "subtitle": "副标题" },
  "pages": [{ "id": "p1", "title": "段落标题", "content": "正文" }],
  "tags": ["标签1"],
  "summary": "50字以内摘要"
}`,
  },
};

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
      // 使用对应平台的内置默认 Prompt，没有匹配则回退到小红书
      const pp = PLATFORM_PROMPTS[platform] || PLATFORM_PROMPTS.xiaohongshu;

      finalPrompt = promptRepo.buildFinalPrompt(
        {
          id: 'builtin',
          user_id: 'system',
          name: `${platform} 默认模板`,
          type: 'text',
          is_default: 1,
          platform,
          system_prompt: pp.system,
          user_prompt: pp.user,
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
