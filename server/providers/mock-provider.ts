/**
 * server/providers/mock-provider.ts — Mock AI Provider
 *
 * 用于开发和测试，返回一个符合 Content DTO 结构的 mock 响应。
 * 不调用任何外部 API，立即返回。
 */

import type { AIProvider, FinalPrompt } from '../types.js';
import { registerProvider } from './index.js';

class MockProvider implements AIProvider {
  readonly name = 'mock';
  readonly model = 'mock-model';

  async generate(prompt: FinalPrompt): Promise<string> {
    // 模拟 AI 延迟（50ms）
    await new Promise((r) => setTimeout(r, 50));

    // 从 userPrompt 中提取主题（简单截取前 30 字）
    const topic = prompt.userPrompt.slice(0, 30).replace(/\n/g, ' ').trim() || '测试内容';

    const mockContent = {
      id: 'mock-' + Date.now(),
      topic,
      titles: [
        { id: 't1', text: `📌 ${topic} | 全面解析` },
        { id: 't2', text: `${topic} — 你不可不知的那些事` },
      ],
      cover: {
        title: topic,
        subtitle: '点击查看详情',
      },
      pages: [
        {
          id: 'p1',
          text: `## 介绍\n\n${topic} 是一个引人关注的话题。本文将带你全面了解。`,
        },
        {
          id: 'p2',
          text: `## 核心要点\n\n关于 ${topic}，有几个关键点需要了解。首先是背景和现状。`,
        },
        {
          id: 'p3',
          text: `## 深入分析\n\n我们来更深入地看看 ${topic} 的细节和值得关注的地方。`,
        },
      ],
      tags: ['内容创作', '干货分享'],
      summary: `关于 ${topic} 的全面介绍与分析。`,
      metadata: {
        promptId: 'mock',
        promptVersion: 'V1',
        model: 'mock-model',
        platform: 'xiaohongshu',
        createdAt: new Date().toISOString(),
      },
    };

    return JSON.stringify(mockContent);
  }
}

const instance = new MockProvider();
registerProvider(instance);

export default instance;
