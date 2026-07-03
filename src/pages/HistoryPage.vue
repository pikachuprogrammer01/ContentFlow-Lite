<script setup lang="ts">
/**
 * 历史页 — 查看和管理历史生成内容
 */

import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useContentStore } from '@/stores/content';
import { exportContent } from '@/exporter';
import DefaultLayout from '@/layouts/DefaultLayout.vue';

const router = useRouter();
const store = useContentStore();
const loaded = ref(false);

onMounted(async () => {
  await store.loadHistory();
  loaded.value = true;
});

function viewContent(id: string): void {
  router.push(`/edit/${id}`);
}

function handleDelete(id: string): void {
  if (confirm('确定要删除这条内容吗？')) {
    store.deleteContent(id);
  }
}

function handleExportJSON(id: string): void {
  const content = store.contentList.find((c) => c.id === id);
  if (!content) return;
  const json = exportContent(content, 'json');
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${content.topic || 'content'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <DefaultLayout>
    <div class="history-page">
      <h2>历史内容</h2>

      <!-- Loading -->
      <div v-if="!loaded" class="state-box">加载中...</div>

      <!-- Empty -->
      <div v-else-if="store.contentList.length === 0" class="state-box empty">
        <p>暂无历史内容</p>
        <router-link to="/">去生成内容 →</router-link>
      </div>

      <!-- List -->
      <div v-else class="history-list">
        <div
          v-for="item in store.contentList"
          :key="item.id"
          class="history-item"
          @click="viewContent(item.id)"
        >
          <div class="item-main">
            <h4>{{ item.topic || '未命名' }}</h4>
            <p class="item-summary">{{ item.summary || '无摘要' }}</p>
            <div class="item-meta">
              <span>{{ item.platform }}</span>
              <span>{{ item.pages.length }} 页</span>
              <span>{{ item.titles.length }} 个标题</span>
              <span>{{ new Date(item.metadata.createdAt).toLocaleDateString() }}</span>
            </div>
          </div>
          <div class="item-actions" @click.stop>
            <button class="btn-small" @click="handleExportJSON(item.id)">导出</button>
            <button class="btn-small btn-danger" @click="handleDelete(item.id)">删除</button>
          </div>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>

<style scoped>
.history-page {
  max-width: 800px;
  margin: 0 auto;
}

h2 {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 24px;
}

.state-box {
  text-align: center;
  padding: 40px 20px;
  color: #9ca3af;
}

.state-box a {
  color: #3b82f6;
  text-decoration: none;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.history-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.item-main {
  flex: 1;
  min-width: 0;
}

.item-main h4 {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-summary {
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #9ca3af;
}

.item-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-small {
  padding: 6px 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #ffffff;
  font-size: 13px;
  cursor: pointer;
  color: #374151;
}

.btn-small:hover {
  background: #f3f4f6;
}

.btn-danger {
  color: #dc2626;
  border-color: #fecaca;
}

.btn-danger:hover {
  background: #fef2f2;
}
</style>
