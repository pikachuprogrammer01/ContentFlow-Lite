/**
 * Content Store — 管理当前生成内容的 UI 状态
 *
 * 遵守规则：
 * - 仅管理 UI 状态（loading / error / empty）
 * - 不包含业务逻辑
 * - 不调用 AI / Parser
 * - 调用 Workflow 来执行业务
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Content, WorkflowError } from '@/types';
import { createEmptyContent } from '@/models';
import { generateContent } from '@/workflow/engine';
import type { WorkflowInput } from '@/types';
import { contentRepository } from '@/repositories';

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
   * 生成内容 — 通过 Workflow
   */
  async function generate(input: WorkflowInput): Promise<boolean> {
    loading.value = true;
    error.value = null;

    const result = await generateContent(input);

    if (result.success && result.content) {
      currentContent.value = result.content;
      await contentRepository.save(result.content);
      loading.value = false;
      return true;
    }

    error.value = result.error ?? {
      code: 'UNKNOWN_ERROR',
      message: '生成失败',
      node: 'input',
      timestamp: new Date().toISOString(),
    };
    loading.value = false;
    return false;
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
  async function regenerate(): Promise<boolean> {
    const meta = currentContent.value.metadata;
    const input: WorkflowInput = {
      topic: currentContent.value.topic,
      platform: currentContent.value.platform,
      promptId: meta.promptId,
      promptVersion: meta.promptVersion,
    };
    return generate(input);
  }

  /**
   * 加载历史内容列表
   */
  async function loadHistory(): Promise<void> {
    contentList.value = await contentRepository.list();
  }

  /**
   * 删除内容
   */
  async function deleteContent(id: string): Promise<void> {
    await contentRepository.delete(id);
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
    loadHistory,
    deleteContent,
    clearError,
    reset,
  };
});
