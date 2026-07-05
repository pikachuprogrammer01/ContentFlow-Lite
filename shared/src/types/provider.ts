/**
 * @contentflow/shared/types/provider — AI/Image Provider 接口
 */

import type { FinalPrompt } from './prompt.js';

// ══════════════════════════════════════════════════════════════
// AIProvider
// ══════════════════════════════════════════════════════════════

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  generate(prompt: FinalPrompt): Promise<string>;
}

// ══════════════════════════════════════════════════════════════
// ImageProvider
// ══════════════════════════════════════════════════════════════

export interface ImageResult {
  url: string;
  width?: number;
  height?: number;
}

export interface ImageProvider {
  readonly name: string;
  readonly model: string;
  generate(prompt: string): Promise<ImageResult>;
}

// ══════════════════════════════════════════════════════════════
// 请求类型
// ══════════════════════════════════════════════════════════════

/** POST /api/generate 请求体 */
export interface GenerateRequest {
  topic: string;
  platform: string;
  provider: string;
  extraRequirements?: string;
  promptId?: string;
}
