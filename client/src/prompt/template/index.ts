/**
 * Prompt Template 管理
 *
 * 不同平台使用不同的 Prompt Template。
 * MVP 阶段内置默认模板，后续可从 prompts/ 目录或配置加载。
 */

import type { PromptTemplate } from '@/types';
import type { Platform } from '@/constants';

/**
 * 内置模板注册表
 */
const templates: Record<string, PromptTemplate> = {
  xiaohongshu_default: {
    id: 'xiaohongshu_default',
    name: '小红书通用模板',
    platform: 'xiaohongshu',
    systemPrompt: `你是一名资深的小红书内容创作者。

你的任务是根据用户提供的主题，生成适合在小红书平台发布的图文内容。

输出格式必须严格遵守以下 JSON 结构（不要输出任何其他内容，只输出纯 JSON）：

{
  "titles": [{"text": "标题1"}, {"text": "标题2"}, ...],
  "cover": {"title": "封面标题", "subtitle": "封面副标题"},
  "pages": [{"title": "页标题", "content": "页正文"}, ...],
  "tags": ["标签1", "标签2", ...],
  "summary": "内容摘要"
}

要求：
1. 生成 5-10 个爆款标题
2. 封面文案要吸引眼球
3. 分页输出 6-8 页正文，每页内容长度均衡
4. 输出 5-10 个相关标签
5. 语言自然、口语化、有亲和力
6. 适合图文形式发布`,
    userPrompt: `请根据以下主题生成小红书图文内容：

主题：{{topic}}
{{extraRequirements}}

请严格按照要求的 JSON 格式输出。`,
  },

  douyin_default: {
    id: 'douyin_default',
    name: '抖音通用模板',
    platform: 'douyin',
    systemPrompt: `你是一名资深的抖音内容创作者。

你的任务是根据用户提供的主题，生成适合在抖音平台发布的图文内容。

输出格式必须严格遵守以下 JSON 结构（不要输出任何其他内容，只输出纯 JSON）：

{
  "titles": [{"text": "标题1"}, {"text": "标题2"}, ...],
  "cover": {"title": "封面标题", "subtitle": "封面副标题"},
  "pages": [{"title": "页标题", "content": "页正文"}, ...],
  "tags": ["标签1", "标签2", ...],
  "summary": "内容摘要"
}

要求：
1. 生成 5-10 个吸引眼球的标题
2. 封面文案要有冲击力
3. 分页输出 6-8 页正文，节奏感强
4. 输出 5-10 个相关标签
5. 语言简短有力、口语化、适合快速阅读
6. 适合图文滑动浏览`,
    userPrompt: `请根据以下主题生成抖音图文内容：

主题：{{topic}}
{{extraRequirements}}

请严格按照要求的 JSON 格式输出。`,
  },
};

/**
 * 根据平台获取默认 Prompt Template
 */
export function getDefaultTemplate(platform: Platform): PromptTemplate {
  const key = `${platform}_default`;
  const template = templates[key];

  if (!template) {
    // fallback to xiaohongshu
    return templates['xiaohongshu_default'];
  }

  return template;
}

/**
 * 根据 ID 获取 Template
 */
export function getTemplateById(id: string): PromptTemplate | null {
  return templates[id] ?? null;
}

/**
 * 获取所有可用模板列表
 */
export function listTemplates(): PromptTemplate[] {
  return Object.values(templates);
}

/**
 * 注册新模板（用于扩展）
 */
export function registerTemplate(template: PromptTemplate): void {
  templates[template.id] = template;
}
