<script setup lang="ts">
/**
 * Prompt 管理页 — 查看 Prompt Template 和 Version
 */

import { ref, onMounted } from 'vue';
import { listTemplates } from '@/prompt/template';
import { listPromptVersions } from '@/prompt/version';
import type { PromptTemplate, PromptVersion } from '@/types';
import DefaultLayout from '@/layouts/DefaultLayout.vue';

const templates = ref<PromptTemplate[]>([]);
const versions = ref<PromptVersion[]>([]);
const selectedTemplateId = ref('');
const loaded = ref(false);

onMounted(async () => {
  templates.value = listTemplates();
  loaded.value = true;
});

async function loadVersions(promptId: string): Promise<void> {
  selectedTemplateId.value = promptId;
  versions.value = await listPromptVersions(promptId);
}
</script>

<template>
  <DefaultLayout>
    <div class="prompt-page">
      <h2>Prompt 管理</h2>

      <div v-if="!loaded" class="state-box">加载中...</div>

      <template v-else>
        <div class="template-grid">
          <div
            v-for="tpl in templates"
            :key="tpl.id"
            class="template-card"
            :class="{ active: selectedTemplateId === tpl.id }"
            @click="loadVersions(tpl.id)"
          >
            <h4>{{ tpl.name }}</h4>
            <span class="platform-badge">{{ tpl.platform }}</span>
          </div>
        </div>

        <div v-if="versions.length > 0" class="version-section">
          <h3>版本历史</h3>
          <div
            v-for="ver in versions"
            :key="ver.id"
            class="version-item"
          >
            <div class="ver-header">
              <strong>{{ ver.version }}</strong>
              <time>{{ new Date(ver.createdAt).toLocaleString() }}</time>
            </div>
            <details class="ver-details">
              <summary>查看 Prompt 详情</summary>
              <div class="prompt-block">
                <h5>System Prompt</h5>
                <pre>{{ ver.content.systemPrompt }}</pre>
                <h5>User Prompt</h5>
                <pre>{{ ver.content.userPrompt }}</pre>
              </div>
            </details>
          </div>
        </div>

        <div v-else-if="selectedTemplateId" class="state-box">
          该模板暂无版本记录
        </div>
      </template>
    </div>
  </DefaultLayout>
</template>

<style scoped>
.prompt-page {
  max-width: 800px;
  margin: 0 auto;
}

h2 {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 24px;
}

h3 {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 24px 0 12px;
}

.state-box {
  text-align: center;
  padding: 40px 20px;
  color: #9ca3af;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.template-card {
  padding: 16px;
  background: #ffffff;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.template-card:hover {
  border-color: #93c5fd;
}

.template-card.active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.template-card h4 {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 6px;
}

.platform-badge {
  font-size: 12px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 4px;
}

.version-section {
  margin-top: 8px;
}

.version-item {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 8px;
}

.ver-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ver-header strong {
  font-size: 15px;
  color: #111827;
}

.ver-header time {
  font-size: 12px;
  color: #9ca3af;
}

.ver-details {
  margin-top: 10px;
}

.ver-details summary {
  cursor: pointer;
  font-size: 13px;
  color: #3b82f6;
}

.prompt-block {
  margin-top: 8px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
}

.prompt-block h5 {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  margin: 8px 0 4px;
  text-transform: uppercase;
}

.prompt-block h5:first-child {
  margin-top: 0;
}

.prompt-block pre {
  font-size: 12px;
  color: #374151;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  line-height: 1.5;
}
</style>
