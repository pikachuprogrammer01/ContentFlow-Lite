/**
 * server/providers/gemini-provider.ts — Gemini 2.0 Flash Provider
 *
 * 使用 @google/genai SDK 调用 Google Gemini API。
 * 需要用户配置 GEMINI_API_KEY（在 user_settings 表中）。
 */

import type { AIProvider, FinalPrompt } from '../types.js';
import { registerProvider } from './index.js';

class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  readonly model = 'gemini-2.0-flash';

  async generate(prompt: FinalPrompt): Promise<string> {
    // 从环境变量获取 API Key（默认配置）
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY 未配置，请在 .env 中设置或在设置页填写');
    }

    // 动态 import 以避免未安装 SDK 时启动失败
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: this.model,
      contents: `${prompt.systemPrompt}\n\n${prompt.userPrompt}`,
      config: {
        responseMimeType: 'application/json',
      },
    });

    return response.text ?? '';
  }
}

const instance = new GeminiProvider();
registerProvider(instance);

export default instance;
