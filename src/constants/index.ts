/**
 * ContentFlow Lite - 常量定义
 */

export const APP_NAME = 'ContentFlow Lite';

export const PLATFORMS = ['xiaohongshu', 'douyin', 'gongzhonghao', 'zhihu'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  xiaohongshu: '小红书',
  douyin: '抖音',
  gongzhonghao: '公众号',
  zhihu: '知乎',
};

export const DEFAULT_PLATFORM: Platform = 'xiaohongshu';

export const DEFAULT_MODEL = 'GPT-5.5';

export const MAX_RETRY_COUNT = 3;

export const STORAGE_KEYS = {
  PROMPT_LIST: 'cfl_prompt_list',
  PROMPT_VERSION: 'cfl_prompt_version',
  CONTENT_LIST: 'cfl_content_list',
  GENERATION_HISTORY: 'cfl_generation_history',
  SETTINGS: 'cfl_settings',
} as const;
