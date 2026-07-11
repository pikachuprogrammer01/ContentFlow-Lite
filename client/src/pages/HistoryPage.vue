<script setup lang="ts">
/**
 * HistoryPage — 查看和管理历史生成内容
 *
 * 通过 Content Store 对接后端 /api/content。
 */

import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NCard, NTag, NSpace, NSpin, NEmpty, NPopconfirm } from 'naive-ui';
import { useContentStore } from '@/stores/content';
import { exportContent } from '@/exporter';
import { PLATFORM_LABEL } from '@/constants';
import type { Platform } from '@/types';
import DefaultLayout from '@/layouts/DefaultLayout.vue';

const router = useRouter();
const store = useContentStore();
const loading = ref(true);

onMounted(async () => {
  await store.loadHistory();
  loading.value = false;
});

function viewContent(id: string): void {
  router.push(`/edit/${id}`);
}

async function handleDelete(id: string): Promise<void> {
  await store.deleteContent(id);
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
      <NSpin v-if="loading" class="state-box" />

      <!-- Empty -->
      <NEmpty
        v-else-if="store.contentList.length === 0"
        description="暂无历史内容"
        class="state-box"
      >
        <template #extra>
          <NButton type="primary" @click="router.push('/')">
            去生成内容
          </NButton>
        </template>
      </NEmpty>

      <!-- List -->
      <div v-else class="history-list">
        <NCard
          v-for="item in store.contentList"
          :key="item.id"
          size="small"
          class="history-item"
          hoverable
          @click="viewContent(item.id)"
        >
          <div class="item-main">
            <h4>{{ item.topic || '未命名' }}</h4>
            <p class="item-summary">{{ item.summary || '无摘要' }}</p>
            <NSpace :size="8" class="item-meta">
              <NTag size="small">{{ PLATFORM_LABEL[item.platform as Platform] || item.platform }}</NTag>
              <span>{{ item.pages.length }} 页</span>
              <span>{{ item.titles.length }} 个标题</span>
              <span>{{ new Date(item.metadata.createdAt).toLocaleDateString() }}</span>
            </NSpace>
          </div>
          <div class="item-actions" @click.stop>
            <NButton size="small" @click="handleExportJSON(item.id)">
              导出
            </NButton>
            <NPopconfirm @positive-click="handleDelete(item.id)">
              <template #trigger>
                <NButton size="small" type="error">
                  删除
                </NButton>
              </template>
              确定删除该内容？
            </NPopconfirm>
          </div>
        </NCard>
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
  display: flex;
  justify-content: center;
  padding: 60px 20px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  cursor: pointer;
}

.item-main {
  flex: 1;
  min-width: 0;
  margin-bottom: 8px;
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
  margin: 0 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  font-size: 12px;
  color: #9ca3af;
}

.item-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
