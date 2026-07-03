<script setup lang="ts">
/**
 * 编辑页 — 查看和编辑生成的内容
 *
 * 职责：展示 Content DTO，允许编辑标题/正文/标签，提供导出
 * 禁止：调用 AI / 拼接 Prompt / 直接操作 Storage
 */

import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useContentStore } from '@/stores/content';
import { exportContent } from '@/exporter';
import { contentRepository } from '@/repositories';
import type { ExportFormat } from '@/types';
import DefaultLayout from '@/layouts/DefaultLayout.vue';

const route = useRoute();
const router = useRouter();
const store = useContentStore();

const activeExportFormat = ref<ExportFormat>('markdown');
const exportPreview = ref('');
const newTag = ref('');

function addTag(): void {
  const tag = newTag.value.trim();
  if (tag && !store.currentContent.tags.includes(tag)) {
    store.currentContent.tags.push(tag);
  }
  newTag.value = '';
}

onMounted(async () => {
  const id = route.params.id as string | undefined;
  if (id) {
    const saved = await contentRepository.get(id);
    if (saved) {
      store.updateContent(saved);
    } else {
      router.push('/');
    }
  } else if (!store.hasContent) {
    router.push('/');
  }
});

function handleExport(): void {
  const result = exportContent(store.currentContent, activeExportFormat.value);
  exportPreview.value = result;

  if (activeExportFormat.value === 'markdown') {
    downloadFile(result, `${store.currentContent.topic || 'content'}.md`, 'text/markdown');
  } else {
    downloadFile(result, `${store.currentContent.topic || 'content'}.json`, 'application/json');
  }
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function handleRegenerate(): void {
  store.regenerate();
}

</script>

<template>
  <DefaultLayout>
    <div v-if="store.hasContent" class="edit-page">
      <!-- 左侧：内容区 -->
      <div class="edit-content">
        <section class="section">
          <h3>主题</h3>
          <p class="topic-display">{{ store.currentContent.topic }}</p>
        </section>

        <section class="section">
          <h3>标题 ({{ store.currentContent.titles.length }})</h3>
          <ul class="title-list">
            <li
              v-for="title in store.currentContent.titles"
              :key="title.id"
              class="title-item"
            >
              <input
                v-model="title.text"
                type="text"
                class="title-input"
              />
            </li>
          </ul>
        </section>

        <section class="section">
          <h3>封面</h3>
          <div class="cover-edit">
            <input
              v-model="store.currentContent.cover.title"
              type="text"
              placeholder="封面标题"
              class="cover-input"
            />
            <input
              v-model="store.currentContent.cover.subtitle"
              type="text"
              placeholder="封面副标题"
              class="cover-input"
            />
          </div>
        </section>

        <section class="section">
          <h3>正文 ({{ store.currentContent.pages.length }} 页)</h3>
          <div
            v-for="(page, index) in store.currentContent.pages"
            :key="page.id"
            class="page-edit"
          >
            <div class="page-header">
              <span class="page-number">第 {{ index + 1 }} 页</span>
              <input
                v-model="page.title"
                type="text"
                placeholder="页面标题"
                class="page-title-input"
              />
            </div>
            <textarea
              v-model="page.content"
              rows="4"
              placeholder="页面正文"
              class="page-content-input"
            />
          </div>
        </section>

        <section class="section">
          <h3>标签</h3>
          <div class="tags-edit">
            <span
              v-for="(tag, index) in store.currentContent.tags"
              :key="index"
              class="tag-chip"
            >
              #{{ tag }}
              <button class="tag-remove" @click="store.currentContent.tags.splice(index, 1)">×</button>
            </span>
            <input
              v-model="newTag"
              type="text"
              placeholder="添加标签..."
              class="tag-add-input"
              @keyup.enter="addTag"
            />
          </div>
        </section>
      </div>

      <!-- 右侧：操作区 -->
      <aside class="edit-sidebar">
        <div class="sidebar-card">
          <h4>导出</h4>
          <select v-model="activeExportFormat" class="export-select">
            <option value="markdown">Markdown</option>
            <option value="json">JSON</option>
          </select>
          <button class="btn-export" @click="handleExport">
            导出 {{ activeExportFormat === 'markdown' ? 'Markdown' : 'JSON' }}
          </button>
        </div>

        <div class="sidebar-card">
          <h4>操作</h4>
          <button class="btn-secondary" @click="handleRegenerate" :disabled="store.loading">
            重新生成
          </button>
          <button class="btn-secondary" @click="router.push('/')">
            新建内容
          </button>
        </div>

        <div class="sidebar-card">
          <h4>信息</h4>
          <dl class="meta-list">
            <dt>Prompt</dt>
            <dd>{{ store.currentContent.metadata.promptId }}@{{ store.currentContent.metadata.promptVersion }}</dd>
            <dt>平台</dt>
            <dd>{{ store.currentContent.platform }}</dd>
            <dt>生成时间</dt>
            <dd>{{ new Date(store.currentContent.metadata.createdAt).toLocaleString() }}</dd>
          </dl>
        </div>
      </aside>
    </div>

    <!-- Empty 状态 -->
    <div v-else-if="!store.loading" class="empty-state">
      <p>暂无内容</p>
      <router-link to="/">去生成内容 →</router-link>
    </div>
  </DefaultLayout>
</template>


<style scoped>
.edit-page {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 28px;
  align-items: start;
}

.edit-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section h3 {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.topic-display {
  font-size: 18px;
  font-weight: 600;
  color: #3b82f6;
  margin: 0;
  padding: 8px 12px;
  background: #eff6ff;
  border-radius: 6px;
}

.title-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.title-item {
  margin: 0;
}

.title-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  color: #111827;
  background: #ffffff;
  box-sizing: border-box;
}

.cover-edit {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cover-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  color: #111827;
  box-sizing: border-box;
}

.page-edit {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 12px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.page-number {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  white-space: nowrap;
}

.page-title-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.page-content-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
}

.tags-edit {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 13px;
  padding: 4px 10px;
  border-radius: 20px;
}

.tag-remove {
  background: none;
  border: none;
  color: #93c5fd;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  line-height: 1;
}

.tag-remove:hover {
  color: #dc2626;
}

.tag-add-input {
  border: 1px dashed #d1d5db;
  border-radius: 20px;
  padding: 4px 12px;
  font-size: 13px;
  color: #6b7280;
  min-width: 100px;
  flex: 1;
}

/* Sidebar */
.edit-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 80px;
}

.sidebar-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 16px;
}

.sidebar-card h4 {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 12px;
}

.export-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 10px;
}

.btn-export {
  width: 100%;
  padding: 10px;
  background: #10b981;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-export:hover {
  background: #059669;
}

.btn-secondary {
  width: 100%;
  padding: 10px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 8px;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.meta-list {
  margin: 0;
  font-size: 13px;
}

.meta-list dt {
  color: #9ca3af;
  margin-top: 8px;
}

.meta-list dd {
  color: #374151;
  margin: 2px 0 0;
}

/* Empty */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
}

.empty-state a {
  color: #3b82f6;
  text-decoration: none;
}
</style>
