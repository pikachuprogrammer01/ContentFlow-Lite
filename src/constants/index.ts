/**
 * src/constants/index.ts — 平台 & Provider 常量
 *
 * 全局统一使用，避免各处硬编码中文标签。
 */

import type { Platform } from '@/types';

export const PLATFORM_LABEL: Record<Platform, string> = {
  xiaohongshu: '小红书',
  wechat: '公众号',
  zhihu: '知乎',
  douyin: '抖音',
  bilibili: 'B站',
  toutiao: '头条',
};

export const PLATFORMS: Platform[] = [
  'xiaohongshu',
  'wechat',
  'zhihu',
  'douyin',
  'bilibili',
  'toutiao',
];

export const PROVIDER_LABEL: Record<string, string> = {
  mock: 'Mock 测试',
  gemini: 'Gemini 2.0 Flash',
  deepseek: 'DeepSeek V4 Flash',
};
