/**
 * Prompt Version 管理
 *
 * 职责：
 * - 获取当前 Prompt Version
 * - Version 不可变
 * - 修改 Prompt 必须生成新 Version
 * - 历史 Version 不可覆盖
 *
 * MVP 阶段使用内存存储，后续迁移至 Repository。
 */

import type { PromptVersion } from '@/types';
import type { Platform } from '@/constants';
import { getDefaultTemplate } from '@/prompt/template';

/**
 * 内存中的 Version 注册表
 * key: `${promptId}@${version}`
 */
const versions: Map<string, PromptVersion> = new Map();

/**
 * 初始化默认版本
 */
function ensureDefaultVersion(platform: Platform): void {
  const promptId = `${platform}_default`;
  const key = `${promptId}@v1.0.0`;

  if (!versions.has(key)) {
    versions.set(key, {
      id: `ver_${promptId}_v1`,
      promptId,
      version: 'v1.0.0',
      content: getDefaultTemplate(platform),
      createdAt: new Date().toISOString(),
    });
  }
}

/**
 * 获取 Prompt Version
 */
export async function getPromptVersion(
  promptId: string,
  version: string,
): Promise<PromptVersion> {
  const key = `${promptId}@${version}`;
  const ver = versions.get(key);

  if (!ver) {
    // 如果是默认模板，自动初始化
    const [platform] = promptId.split('_');
    ensureDefaultVersion(platform as Platform);

    const fallback = versions.get(key);
    if (fallback) {
      return fallback;
    }

    throw Object.assign(new Error(`Prompt Version 不存在: ${key}`), {
      code: 'VERSION_ERROR',
    });
  }

  return ver;
}

/**
 * 创建新的 Prompt Version（不覆盖已有版本）
 */
export async function createPromptVersion(version: PromptVersion): Promise<void> {
  const key = `${version.promptId}@${version.version}`;

  if (versions.has(key)) {
    throw Object.assign(new Error(`Prompt Version 已存在: ${key}，不允许覆盖`), {
      code: 'VERSION_ERROR',
    });
  }

  versions.set(key, { ...version });
}

/**
 * 获取某个 Prompt 的所有版本列表
 */
export async function listPromptVersions(promptId: string): Promise<PromptVersion[]> {
  const result: PromptVersion[] = [];

  for (const [, ver] of versions) {
    if (ver.promptId === promptId) {
      result.push(ver);
    }
  }

  return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * 获取最新的 Prompt Version
 */
export async function getLatestVersion(promptId: string): Promise<PromptVersion | null> {
  const all = await listPromptVersions(promptId);
  return all.length > 0 ? all[0] : null;
}
