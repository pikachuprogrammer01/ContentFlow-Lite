/**
 * client/src/utils/platform.ts — 平台中文映射
 */

const PLATFORM_MAP: Record<string, string> = {
  xiaohongshu: '小红书',
  douyin: '抖音',
  gongzhonghao: '公众号',
  zhihu: '知乎',
  bilibili: 'B站',
};

/** 将平台标识转为中文名，未知值原样返回 */
export function platformLabel(value: string): string {
  return PLATFORM_MAP[value] || value;
}
