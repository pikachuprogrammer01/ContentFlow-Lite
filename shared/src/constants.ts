/**
 * @contentflow/shared — 共享常量
 *
 * 客户端与服务端统一使用，避免各处硬编码。
 */

import type { Platform } from './types.js';

// ══════════════════════════════════════════════════════════════
// 平台
// ══════════════════════════════════════════════════════════════

/** 平台标识 → 中文名称 */
export const PLATFORM_LABEL: Record<Platform, string> = {
  xiaohongshu: '小红书',
  wechat: '公众号',
  zhihu: '知乎',
  douyin: '抖音',
  bilibili: 'B站',
  toutiao: '头条',
};

/** 平台列表 */
export const PLATFORMS: Platform[] = [
  'xiaohongshu',
  'wechat',
  'zhihu',
  'douyin',
  'bilibili',
  'toutiao',
];

// ══════════════════════════════════════════════════════════════
// Provider / Model
// ══════════════════════════════════════════════════════════════

/** Provider Label 映射 */
export const PROVIDER_LABEL: Record<string, string> = {
  mock: 'Mock 测试',
  gemini: 'Gemini 2.0 Flash',
  deepseek: 'DeepSeek V4 Flash',
};

// ══════════════════════════════════════════════════════════════
// Workflow
// ══════════════════════════════════════════════════════════════

/** Workflow 最大重试次数 */
export const MAX_RETRY_COUNT = 3;

/** 默认文本模型（Provider 未指定时使用） */
export const DEFAULT_MODEL = 'gemini-2.0-flash';
