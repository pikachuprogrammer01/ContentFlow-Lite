/**
 * Parser — 系统唯一数据转换入口
 *
 * 职责：
 * - JSON 校验
 * - 数据解析
 * - 数据标准化
 * - 默认值填充
 * - Content DTO 构建
 *
 * Parser 只能由 Workflow 调用，禁止页面或其他模块直接调用。
 */

import type { Content, WorkflowInput } from '@/types';
import {
  createContent,
  createCover,
  createMetadata,
  createPage,
  createTitle,
} from '@/models';
import { DEFAULT_MODEL } from '@/constants';

interface RawContent {
  titles?: Array<{ text?: string }>;
  cover?: { title?: string; subtitle?: string };
  pages?: Array<{
    title?: string;
    content?: string;
    imagePrompt?: string;
  }>;
  tags?: string[];
  summary?: string;
}

/**
 * 解析 AI 原始返回内容为 Content DTO
 */
export function parseContent(rawResponse: string, input: WorkflowInput): Content {
  // 1. JSON 提取（处理可能的 markdown code block 包裹）
  let jsonStr = rawResponse.trim();

  // 移除 markdown code block 标记
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  // 2. JSON 解析
  let raw: RawContent;
  try {
    raw = JSON.parse(jsonStr);
  } catch {
    throw Object.assign(new Error('AI 返回内容不是有效的 JSON，无法解析'), {
      code: 'PARSE_ERROR',
    });
  }

  // 3. 数据标准化与默认值填充
  const titles = (raw.titles ?? [])
    .filter((t) => t.text && t.text.trim().length > 0)
    .map((t) => createTitle(t.text!));

  const cover = raw.cover
    ? createCover(raw.cover.title ?? '', raw.cover.subtitle ?? '')
    : createCover('', '');

  const pages = (raw.pages ?? [])
    .filter((p) => p.title || p.content)
    .map((p) =>
      createPage(
        p.title ?? '无标题',
        p.content ?? '',
        p.imagePrompt,
      ),
    );

  const tags = raw.tags ?? [];
  const summary = raw.summary ?? '';

  // 4. 构建 Metadata
  const metadata = createMetadata(
    input.promptId,
    input.promptVersion,
    DEFAULT_MODEL,
    input.platform,
  );

  // 5. 组合 Content DTO
  return createContent(
    input.topic,
    input.platform,
    titles,
    cover,
    pages,
    tags,
    summary,
    metadata,
  );
}
