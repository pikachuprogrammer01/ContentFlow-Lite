/**
 * Repository — 数据持久化层
 *
 * 所有数据操作必须通过 Repository。
 * MVP 阶段使用 localStorage，后续可替换为 IndexedDB / 云端存储。
 */

import type { Repository } from '@/types';

const STORAGE_PREFIX = 'cfl_';

/**
 * localStorage 通用 Repository 实现
 */
class LocalStorageRepository<T extends { id: string }> implements Repository<T> {
  private collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  private getKey(id: string): string {
    return `${STORAGE_PREFIX}${this.collectionName}_${id}`;
  }

  private getListKey(): string {
    return `${STORAGE_PREFIX}${this.collectionName}_list`;
  }

  async save(item: T): Promise<void> {
    // 保存 item
    localStorage.setItem(this.getKey(item.id), JSON.stringify(item));

    // 更新列表
    const ids = await this.getIds();
    if (!ids.includes(item.id)) {
      ids.unshift(item.id);
      localStorage.setItem(this.getListKey(), JSON.stringify(ids));
    }
  }

  async get(id: string): Promise<T | null> {
    const raw = localStorage.getItem(this.getKey(id));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async list(): Promise<T[]> {
    const ids = await this.getIds();
    const items: T[] = [];

    for (const id of ids) {
      const item = await this.get(id);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  async delete(id: string): Promise<void> {
    localStorage.removeItem(this.getKey(id));

    const ids = await this.getIds();
    const filtered = ids.filter((i) => i !== id);
    localStorage.setItem(this.getListKey(), JSON.stringify(filtered));
  }

  private async getIds(): Promise<string[]> {
    const raw = localStorage.getItem(this.getListKey());
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}

/**
 * 创建指定集合的 Repository 实例
 */
export function createRepository<T extends { id: string }>(
  collectionName: string,
): Repository<T> {
  return new LocalStorageRepository<T>(collectionName);
}

// 预置的 Repository 实例
import type { Content, PromptVersion, GenerationRecord } from '@/types';

export const contentRepository = createRepository<Content>('content');
export const promptVersionRepository =
  createRepository<PromptVersion>('prompt_version');
export const generationRepository =
  createRepository<GenerationRecord>('generation');
