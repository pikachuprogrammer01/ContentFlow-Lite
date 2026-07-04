/**
 * server/providers/deepseek-provider.ts — DeepSeek V4 Flash Provider
 *
 * 使用 OpenAI 兼容 SDK 调用 DeepSeek API。
 * 需要用户配置 DEEPSEEK_API_KEY（在 user_settings 表中）。
 */

import type { AIProvider, FinalPrompt } from '../types.js';
import { registerProvider } from './index.js';

class DeepSeekProvider implements AIProvider {
  readonly name = 'deepseek';
  readonly model = 'deepseek-v4-flash';

  async generate(prompt: FinalPrompt): Promise<string> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY 未配置，请在 .env 中设置或在设置页填写');
    }

    const { default: OpenAI } = await import('openai');

    const client = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey,
    });

    const completion = await client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: prompt.systemPrompt },
        { role: 'user', content: prompt.userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    return completion.choices[0].message.content ?? '';
  }
}

const instance = new DeepSeekProvider();
registerProvider(instance);

export default instance;
