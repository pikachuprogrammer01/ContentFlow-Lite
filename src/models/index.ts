/**
 * Content DTO 工厂与默认值
 *
 * 所有模块应通过此文件的工厂函数创建 Content 相关对象，
 * 确保数据结构始终一致。
 */

import type {
  Content,
  Cover,
  Metadata,
  Page,
  Title,
  GenerationRecord,
  WorkflowContext,
} from '@/types';

let _idCounter = 0;

function generateId(prefix: string): string {
  _idCounter += 1;
  return `${prefix}_${Date.now()}_${_idCounter}`;
}

export function createTitle(text: string): Title {
  return {
    id: generateId('title'),
    text,
  };
}

export function createCover(title: string, subtitle: string): Cover {
  return {
    title,
    subtitle,
  };
}

export function createPage(title: string, content: string, imagePrompt?: string): Page {
  return {
    id: generateId('page'),
    title,
    content,
    ...(imagePrompt ? { imagePrompt } : {}),
  };
}

export function createMetadata(
  promptId: string,
  promptVersion: string,
  model: string,
  platform: string,
): Metadata {
  return {
    promptId,
    promptVersion,
    model,
    platform,
    createdAt: new Date().toISOString(),
    generator: 'ContentFlow Lite',
  };
}

export function createContent(
  topic: string,
  platform: string,
  titles: Title[],
  cover: Cover,
  pages: Page[],
  tags: string[],
  summary: string,
  metadata: Metadata,
): Content {
  return {
    id: generateId('content'),
    topic,
    platform,
    titles,
    cover,
    pages,
    tags,
    summary,
    metadata,
  };
}

export function createEmptyContent(platform: string = ''): Content {
  return {
    id: generateId('content'),
    topic: '',
    platform,
    titles: [],
    cover: { title: '', subtitle: '' },
    pages: [],
    tags: [],
    summary: '',
    metadata: {
      promptId: '',
      promptVersion: '',
      model: '',
      platform,
      createdAt: new Date().toISOString(),
      generator: 'ContentFlow Lite',
    },
  };
}

export function createGenerationRecord(
  topic: string,
  platform: string,
  promptId: string,
  promptVersion: string,
  model: string,
  contentId: string,
): GenerationRecord {
  return {
    id: generateId('gen'),
    topic,
    platform,
    promptId,
    promptVersion,
    model,
    contentId,
    createdAt: new Date().toISOString(),
  };
}

export function createWorkflowContext(workflowId: string): WorkflowContext {
  return {
    workflowId,
    input: {
      topic: '',
      platform: '',
      promptId: '',
      promptVersion: '',
    },
    startedAt: new Date().toISOString(),
    nodeTimings: {
      input: 0,
      prompt: 0,
      provider: 0,
      parse: 0,
      dto: 0,
      output: 0,
    },
  };
}
