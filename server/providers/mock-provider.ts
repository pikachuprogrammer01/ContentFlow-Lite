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

  async generate(_prompt: FinalPrompt): Promise<string> {
    // 模拟 AI 延迟（50ms）
    await new Promise((r) => setTimeout(r, 50));

    const mockContent = {
      id: 'mock-' + Date.now(),
      topic: '春日穿搭指南',
      platform: 'xiaohongshu',
      titles: [
        { id: 't1', text: '🍃 春日必备 | 7 套温柔穿搭，照着穿就好看', type: 'main' },
        { id: 't2', text: '一周不重样的春日穿搭灵感', type: 'sub' },
      ],
      cover: {
        title: '春日穿搭指南',
        subtitle: '温柔气质，穿出春日氛围感',
      },
      pages: [
        {
          id: 'p1',
          order: 1,
          text: '周一：奶油白针织开衫 + 高腰牛仔裤，配一双裸色单鞋，温柔又利落。',
        },
        {
          id: 'p2',
          order: 2,
          text: '周二：碎花连衣裙外搭牛仔外套，春日的浪漫和休闲感都有了。',
        },
        {
          id: 'p3',
          order: 3,
          text: '周三：条纹衬衫 + 卡其色阔腿裤，法式慵懒风，谁穿谁好看。',
        },
        {
          id: 'p4',
          order: 4,
          text: '周四：粉色卫衣 + 白色百褶裙，甜美学院风，减龄神器。',
        },
        {
          id: 'p5',
          order: 5,
          text: '周五：黑色小吊带 + 薄款西装外套，下班直接去约会。',
        },
      ],
      tags: ['春日穿搭', '每日穿搭', '温柔风', '穿搭灵感'],
      summary: '5 套春日温柔穿搭，从周一到周五不重样，轻松穿出春日氛围感。',
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
