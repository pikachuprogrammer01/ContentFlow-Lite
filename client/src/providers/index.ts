/**
 * AI Provider — 模型调用抽象层
 *
 * 职责：
 * - 统一调用 AI 模型
 * - 屏蔽不同 Provider 差异
 * - 返回原始响应字符串
 *
 * MVP 阶段提供 Mock Provider 用于开发调试，
 * 后续接入真实 API 时仅需新增 Provider 实现。
 */

import type { AIProvider, FinalPrompt } from '@/types';

/**
 * 当前激活的 Provider
 */
let activeProvider: AIProvider | null = null;

/**
 * Mock AI Provider — 用于开发调试
 */
class MockProvider implements AIProvider {
  readonly name = 'MockProvider';
  readonly model = 'mock-gpt';

  async generate(prompt: FinalPrompt): Promise<string> {
    // 模拟网络延迟
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 1000));

    const topic =
      prompt.userPrompt.match(/主题：(.+)/)?.[1]?.trim() ?? '未知主题';

    // 返回符合 Content DTO 的示例 JSON
    return JSON.stringify({
      titles: [
        { text: `${topic} — 超详细攻略，建议收藏` },
        { text: `第一次去${topic}，看这一篇就够了` },
        { text: `${topic}两天一夜，人均不到500` },
        { text: `别再去${topic}踩坑了，这篇必看` },
        { text: `${topic}最全玩法，99%的人都不知道` },
      ],
      cover: {
        title: `${topic}终极攻略`,
        subtitle: '建议先收藏，出发前再看一遍',
      },
      pages: [
        {
          title: '出发前准备',
          content: `去${topic}之前，一定要提前做好功课。建议提前查看天气预报，准备好合适的装备和衣物。别忘了带上充电宝和相机。`,
        },
        {
          title: '交通攻略',
          content: `到达${topic}有多种交通方式可选。高铁是最便捷的选择，大约需要2-3小时。到了当地之后可以打车或坐公交前往景区。`,
        },
        {
          title: '必打卡景点',
          content: `${topic}最值得去的几个地方：第一站推荐去核心景区，风景最美；第二站可以去观景台，视野极佳；第三站适合拍照留念。`,
        },
        {
          title: '美食推荐',
          content: `${topic}当地有很多特色美食不容错过。推荐尝试当地小吃，味道地道价格实惠。还有几家网红餐厅值得排队尝尝。`,
        },
        {
          title: '住宿建议',
          content: `在${topic}住宿选择很多。想要性价比高的可以选民宿，想要舒适度的可以选酒店。建议提前预订，旺季房源紧张。`,
        },
        {
          title: '避坑指南',
          content: `去${topic}有几点一定要注意：不要在景区内买高价纪念品，不要在路边随意搭车，提前规划好路线避免走冤枉路。`,
        },
        {
          title: '拍照攻略',
          content: `${topic}拍照最佳时间是清晨和黄昏，光线柔和出片率高。推荐几个绝佳机位：山顶观景台、湖边栈道、古建筑前。`,
        },
        {
          title: '总结建议',
          content: `${topic}整体来说非常值得一去。适合周末短途出游，也适合长假深度游。按照本攻略走，一定能玩得开心！`,
        },
      ],
      tags: [
        topic,
        '旅游攻略',
        '周末去哪',
        '小众旅行',
        '拍照打卡',
        '美食推荐',
        '旅行干货',
      ],
      summary: `一份完整的${topic}旅行攻略，涵盖交通、住宿、美食、景点和避坑指南，适合第一次前往的游客参考。`,
    });
  }
}

/**
 * 注册 Provider
 */
export function registerProvider(provider: AIProvider): void {
  activeProvider = provider;
}

/**
 * 获取当前 Provider（默认使用 Mock）
 */
function getProvider(): AIProvider {
  if (!activeProvider) {
    activeProvider = new MockProvider();
  }
  return activeProvider;
}

/**
 * 调用 AI Provider 生成内容
 */
export async function callProvider(prompt: FinalPrompt): Promise<string> {
  const provider = getProvider();
  return provider.generate(prompt);
}
