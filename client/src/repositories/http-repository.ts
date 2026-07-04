/**
 * src/repositories/http-repository.ts — 泛型 HTTP Repository
 *
 * 实现 docs/types.md §6.1 定义的 Repository<T> 接口，
 * 通过 api-client 对接后端 RESTful 端点。
 *
 * 用法：
 *   const contentRepo = new HttpRepository<Content>('/api/content');
 *   const list = await contentRepo.list({ platform: 'xiaohongshu' });
 */

import { api } from '@/utils/api-client';
import type { Repository } from '@/types';

export class HttpRepository<T extends { id: string }> implements Repository<T> {
  constructor(private readonly basePath: string) {}

  async getById(id: string): Promise<T | null> {
    return api.get<T>(`${this.basePath}/${id}`);
  }

  async list(filter?: Record<string, unknown>): Promise<T[]> {
    const query = filter
      ? '?' + new URLSearchParams(filter as Record<string, string>).toString()
      : '';
    return api.get<T[]>(`${this.basePath}${query}`);
  }

  async create(item: Omit<T, 'id'>): Promise<T> {
    return api.post<T>(this.basePath, item);
  }

  async update(id: string, item: Partial<T>): Promise<T> {
    return api.put<T>(`${this.basePath}/${id}`, item);
  }

  async delete(id: string): Promise<void> {
    await api.delete(`${this.basePath}/${id}`);
  }
}
