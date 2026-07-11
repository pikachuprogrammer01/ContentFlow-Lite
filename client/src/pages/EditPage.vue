<script setup lang="ts">
/**
 * EditPage — 查看和编辑生成的内容
 *
 * 职责：展示 Content DTO，允许编辑标题/正文/标签，提供导出和保存
 * 禁止：调用 AI / 拼接 Prompt
 */

import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NButton,
  NInput,
  NTag,
  NSelect,
  NSpace,
  NCard,
} from 'naive-ui';
import { useContentStore } from '@/stores/content';
import { exportContent } from '@/exporter';
import { PLATFORM_LABEL, PROVIDER_LABEL } from '@/constants';
import type { ExportFormat, Platform } from '@/types';
import DefaultLayout from '@/layouts/DefaultLayout.vue';

const route = useRoute();
const router = useRouter();
const store = useContentStore();

const activeExportFormat = ref<ExportFormat>('markdown');
const newTag = ref('');
const saving = ref(false);

const exportFormatOptions = [
  { label: 'Markdown', value: 'markdown' },
  { label: 'JSON', value: 'json' },
];

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
    const saved = await store.loadContent(id);
    if (saved) {
      store.updateContent(saved);
    } else {
      router.push('/');
    }
  } else if (!store.hasContent) {
    router.push('/');
  }
});

async function handleSave(): Promise<void> {
  saving.value = true;
  try {
    await store.saveContent(store.currentContent);
  } finally {
    saving.value = false;
  }
}

function handleExport(): void {
  exportContent(store.currentContent, activeExportFormat.value);

  const content = store.currentContent;
  const topic = content.topic || 'content';

  if (activeExportFormat.value === 'markdown') {
    const result = exportContent(content, 'markdown');
    downloadFile(result, `${topic}.md`, 'text/markdown');
  } else {
    const result = exportContent(content, 'json');
    downloadFile(result, `${topic}.json`, 'application/json');
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

async function handleRegenerate(): Promise<void> {
  await store.regenerate('mock');
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
          <NSpace vertical>
            <NInput
              v-for="title in store.currentContent.titles"
              :key="title.id"
              :value="title.text"
              @update:value="(v: string) => (title.text = v)"
            />
          </NSpace>
        </section>

        <section class="section">
          <h3>封面</h3>
          <NSpace vertical>
            <NInput
              :value="store.currentContent.cover.title"
              placeholder="封面标题"
              @update:value="(v: string) => (store.currentContent.cover.title = v)"
            />
            <NInput
              :value="store.currentContent.cover.subtitle"
              placeholder="封面副标题"
              @update:value="(v: string) => (store.currentContent.cover.subtitle = v)"
            />
          </NSpace>
        </section>

        <section class="section">
          <h3>正文 ({{ store.currentContent.pages.length }} 页)</h3>
          <NCard
            v-for="(page, index) in store.currentContent.pages"
            :key="page.id"
            size="small"
            :title="`第 ${index + 1} 页`"
            class="page-card"
          >
            <NInput
              :value="page.text"
              type="textarea"
              placeholder="页面正文"
              :autosize="{ minRows: 4, maxRows: 10 }"
              @update:value="(v: string) => (page.text = v)"
            />
          </NCard>
        </section>

        <section class="section">
          <h3>标签</h3>
          <NSpace>
            <NTag
              v-for="(tag, index) in store.currentContent.tags"
              :key="index"
              closable
              @close="store.currentContent.tags.splice(index, 1)"
            >
              #{{ tag }}
            </NTag>
            <NInput
              v-model:value="newTag"
              placeholder="添加标签..."
              size="small"
              style="width: 120px"
              @keyup.enter="addTag"
            />
          </NSpace>
        </section>
      </div>

      <!-- 右侧：操作区 -->
      <aside class="edit-sidebar">
        <NCard title="导出" size="small">
          <NSpace vertical>
            <NSelect
              v-model:value="activeExportFormat"
              :options="exportFormatOptions"
            />
            <NButton type="success" block @click="handleExport">
              导出 {{ activeExportFormat === 'markdown' ? 'Markdown' : 'JSON' }}
            </NButton>
          </NSpace>
        </NCard>

        <NCard title="操作" size="small">
          <NSpace vertical>
            <NButton
              type="primary"
              block
              :loading="saving"
              @click="handleSave"
            >
              保存到云端
            </NButton>
            <NButton
              block
              :disabled="store.loading"
              @click="handleRegenerate"
            >
              重新生成
            </NButton>
            <NButton block @click="router.push('/')">
              新建内容
            </NButton>
          </NSpace>
        </NCard>

        <NCard title="信息" size="small">
          <dl class="meta-list">
            <dt>Prompt</dt>
            <dd>{{ store.currentContent.metadata.promptId }}@{{ store.currentContent.metadata.promptVersion }}</dd>
            <dt>平台</dt>
            <dd>{{ PLATFORM_LABEL[store.currentContent.platform as Platform] || store.currentContent.platform }}</dd>
            <dt>模型</dt>
            <dd>{{ PROVIDER_LABEL[store.currentContent.metadata.model] || store.currentContent.metadata.model }}</dd>
            <dt>生成时间</dt>
            <dd>{{ new Date(store.currentContent.metadata.createdAt).toLocaleString() }}</dd>
          </dl>
        </NCard>
      </aside>
    </div>

    <!-- Empty 状态 -->
    <div v-else class="empty-state">
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

.page-card {
  margin-bottom: 12px;
}

/* Sidebar */
.edit-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 80px;
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
