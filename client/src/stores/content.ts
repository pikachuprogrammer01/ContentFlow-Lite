/**
 * Content Store — 管理当前生成内容的 UI 状态
 *
 * 遵守规则：
 * - 仅管理 UI 状态（loading / error / empty）
 * - 不包含业务逻辑
 * - 通过 api-client 调用后端 POST /api/generate
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Content, WorkflowError } from '@/types';
import { createEmptyContent } from '@/models';
import { api } from '@/utils/api-client';
import { HttpRepository } from '@/repositories/http-repository';

const contentRepo = new HttpRepository<Content>('/api/content');

export const useContentStore = defineStore('content', () => {
  // === 状态 ===
  const currentContent = ref<Content>(createEmptyContent());
  const loading = ref(false);
  const error = ref<WorkflowError | null>(null);
  const contentList = ref<Content[]>([]);

  // === 计算属性 ===
  const hasContent = computed(() => currentContent.value.pages.length > 0);
  const isEmpty = computed(() => !loading.value && !hasContent && !error.value);

  // === 操作 ===

  /**
   * 生成内容 — POST /api/generate
   */
  async function generate(params: {
    topic: string;
    platform: string;
    provider: string;
    extraRequirements?: string;
  }): Promise<boolean> {
    loading.value = true;
    error.value = null;

    try {
      const res = await api.post<{ content: Content }>('/api/generate', params);
      currentContent.value = res.content;
      return true;
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string; node?: string };
      error.value = {
        code: (err.code as WorkflowError['code']) || 'UNKNOWN_ERROR',
        message: err.message || '生成失败',
        node: (err.node as WorkflowError['node']) || 'input',
        timestamp: new Date().toISOString(),
      };
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 更新当前内容（编辑用）
   */
  function updateContent(content: Content): void {
    currentContent.value = content;
  }

  /**
   * 重新生成
   */
  async function regenerate(provider: string): Promise<boolean> {
    return generate({
      topic: currentContent.value.topic,
      platform: currentContent.value.platform,
      provider,
      extraRequirements: currentContent.value.extraRequirements,
    });
  }

  /**
   * 从后端加载内容详情
   */
  async function loadContent(id: string): Promise<Content | null> {
    return contentRepo.getById(id);
  }

  /**
   * 保存内容到后端
   */
  async function saveContent(content: Content): Promise<void> {
    await contentRepo.update(content.id, content);
  }

  /**
   * 加载历史内容列表
   */
  async function loadHistory(): Promise<void> {
    contentList.value = await contentRepo.list();
  }

  /**
   * 删除内容
   */
  async function deleteContent(id: string): Promise<void> {
    await contentRepo.delete(id);
    contentList.value = contentList.value.filter((c) => c.id !== id);
    if (currentContent.value.id === id) {
      currentContent.value = createEmptyContent();
    }
  }

  /**
   * 清除当前错误
   */
  function clearError(): void {
    error.value = null;
  }

  /**
   * 重置为空白内容
   */
  function reset(): void {
    currentContent.value = createEmptyContent();
    error.value = null;
  }

  return {
    currentContent,
    loading,
    error,
    contentList,
    hasContent,
    isEmpty,
    generate,
    updateContent,
    regenerate,
    loadContent,
    saveContent,
    loadHistory,
    deleteContent,
    clearError,
    reset,
  };
});
