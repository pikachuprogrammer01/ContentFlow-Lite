<script setup lang="ts">
/**
 * PromptPage — 查看 Prompt Template 和版本历史
 *
 * 通过 api-client 对接后端 /api/prompt/*。
 */

import { ref, onMounted } from 'vue';
import {
  NCard,
  NTag,
  NButton,
  NSpin,
  NEmpty,
  NSpace,
  NCollapse,
  NCollapseItem,
} from 'naive-ui';
import { api } from '@/utils/api-client';
import DefaultLayout from '@/layouts/DefaultLayout.vue';

interface TemplateItem {
  id: string;
  name: string;
  platform: string;
  type: string;
  is_default: number;
  created_at: string;
}

interface VersionItem {
  id: string;
  prompt_id: string;
  version: string;
  system_prompt: string;
  user_prompt: string;
  created_at: string;
}

const templates = ref<TemplateItem[]>([]);
const versions = ref<VersionItem[]>([]);
const selectedTemplateId = ref('');
const loading = ref(true);

onMounted(async () => {
  try {
    templates.value = await api.get<TemplateItem[]>('/api/prompt/templates');
  } catch {
    // 忽略，显示空状态
  }
  loading.value = false;
});

async function loadVersions(promptId: string): Promise<void> {
  selectedTemplateId.value = promptId;
  try {
    versions.value = await api.get<VersionItem[]>(
      `/api/prompt/versions/${promptId}`,
    );
  } catch {
    versions.value = [];
  }
}
</script>

<template>
  <DefaultLayout>
    <div class="prompt-page">
      <h2>Prompt 管理</h2>

      <NSpin v-if="loading" class="state-box" />

      <template v-else>
        <!-- Empty -->
        <NEmpty
          v-if="templates.length === 0"
          description="暂无 Prompt 模板"
          class="state-box"
        />

        <template v-else>
          <!-- Template Grid -->
          <div class="template-grid">
            <NCard
              v-for="tpl in templates"
              :key="tpl.id"
              size="small"
              :class="{ 'selected-card': selectedTemplateId === tpl.id }"
              hoverable
              @click="loadVersions(tpl.id)"
            >
              <div class="tpl-header">
                <strong>{{ tpl.name }}</strong>
                <NTag size="small">{{ tpl.platform }}</NTag>
              </div>
            </NCard>
          </div>

          <!-- Version List -->
          <div v-if="versions.length > 0" class="version-section">
            <h3>版本历史</h3>
            <NCollapse>
              <NCollapseItem
                v-for="ver in versions"
                :key="ver.id"
                :title="ver.version"
                :name="ver.id"
              >
                <template #header-extra>
                  <span class="ver-date">
                    {{ new Date(ver.created_at).toLocaleString() }}
                  </span>
                </template>
                <div class="prompt-block">
                  <h5>System Prompt</h5>
                  <pre>{{ ver.system_prompt }}</pre>
                  <h5>User Prompt</h5>
                  <pre>{{ ver.user_prompt }}</pre>
                </div>
              </NCollapseItem>
            </NCollapse>
          </div>

          <NEmpty
            v-else-if="selectedTemplateId"
            description="该模板暂无版本记录"
            class="state-box"
          />
        </template>
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
  display: flex;
  justify-content: center;
  padding: 60px 20px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.selected-card {
  border-color: #3b82f6 !important;
  background: #eff6ff;
}

.tpl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tpl-header strong {
  font-size: 14px;
  color: #111827;
}

.version-section {
  margin-top: 8px;
}

.ver-date {
  font-size: 12px;
  color: #9ca3af;
}

.prompt-block {
  background: #f9fafb;
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
