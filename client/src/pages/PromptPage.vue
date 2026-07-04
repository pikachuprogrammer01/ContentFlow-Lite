<script setup lang="ts">
/**
 * PromptPage — 查看和管理 Prompt 模板
 *
 * 用户可创建、编辑、删除自己的 Prompt 模板，查看版本历史。
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
  NModal,
  NInput,
  NSelect,
  NForm,
  NFormItem,
  NPopconfirm,
  useMessage,
} from 'naive-ui';
import { api } from '@/utils/api-client';
import { PLATFORM_LABEL, PLATFORMS } from '@/constants';
import DefaultLayout from '@/layouts/DefaultLayout.vue';

const message = useMessage();

// ── 数据 ──────────────────────────────────────────────

interface TemplateItem {
  id: string;
  name: string;
  platform: string;
  type: string;
  is_default: number;
  system_prompt: string;
  user_prompt: string;
  created_at: string;
  updated_at: string;
}

interface VersionItem {
  id: string;
  version: string;
  system_prompt: string;
  user_prompt: string;
  created_at: string;
}

const templates = ref<TemplateItem[]>([]);
const versions = ref<VersionItem[]>([]);
const selectedTemplateId = ref('');
const loading = ref(true);

async function loadTemplates(): Promise<void> {
  loading.value = true;
  try {
    const res = await api.get<{ data: TemplateItem[] }>('/api/prompt/templates');
    templates.value = Array.isArray(res) ? res : (res as any)?.data || [];
  } catch {
    // ignore
  }
  loading.value = false;
}

async function loadVersions(promptId: string): Promise<void> {
  selectedTemplateId.value = promptId;
  try {
    const res = await api.get<{ data: VersionItem[] }>(`/api/prompt/versions/${promptId}`);
    versions.value = Array.isArray(res) ? res : (res as any)?.data || [];
  } catch {
    versions.value = [];
  }
}

// ── 创建/编辑弹窗 ─────────────────────────────────────

const showModal = ref(false);
const editing = ref(false);
const editId = ref('');
const formName = ref('');
const formPlatform = ref('xiaohongshu');
const formSystem = ref('');
const formUser = ref('');
const formType = ref<'text' | 'image'>('text');
const saving = ref(false);

function openCreate(): void {
  editing.value = false;
  editId.value = '';
  formName.value = '';
  formPlatform.value = 'xiaohongshu';
  formType.value = 'text';
  formSystem.value = '';
  formUser.value = '';
  showModal.value = true;
}

function openEdit(tpl: TemplateItem): void {
  editing.value = true;
  editId.value = tpl.id;
  formName.value = tpl.name;
  formPlatform.value = tpl.platform;
  formType.value = tpl.type as 'text' | 'image';
  formSystem.value = tpl.system_prompt || '';
  formUser.value = tpl.user_prompt || '';
  showModal.value = true;
}

async function handleSave(): Promise<void> {
  if (!formName.value || !formSystem.value || !formUser.value) {
    message.warning('请填写必填字段');
    return;
  }
  saving.value = true;
  try {
    if (editing.value) {
      await api.put(`/api/prompt/templates/${editId.value}`, {
        name: formName.value,
        platform: formPlatform.value,
        systemPrompt: formSystem.value,
        userPrompt: formUser.value,
        type: formType.value,
      });
      message.success('已更新（新版本已生成）');
    } else {
      await api.post('/api/prompt/templates', {
        name: formName.value,
        platform: formPlatform.value,
        type: formType.value,
        systemPrompt: formSystem.value,
        userPrompt: formUser.value,
      });
      message.success('模板已创建');
    }
    showModal.value = false;
    loadTemplates();
    if (editing.value) loadVersions(editId.value);
  } catch (e: unknown) {
    const err = e as { message?: string };
    message.error(err?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function handleDelete(id: string): Promise<void> {
  try {
    await api.delete(`/api/prompt/templates/${id}`);
    message.success('已删除');
    selectedTemplateId.value = '';
    versions.value = [];
    loadTemplates();
  } catch (e: unknown) {
    const err = e as { message?: string };
    message.error(err?.message || '删除失败');
  }
}

onMounted(loadTemplates);
</script>

<template>
  <DefaultLayout>
    <div class="prompt-page">
      <div class="page-header">
        <h2>Prompt 管理</h2>
        <NButton type="primary" @click="openCreate">新建模板</NButton>
      </div>

      <NSpin v-if="loading" class="state-box" />

      <template v-else>
        <NEmpty
          v-if="templates.length === 0"
          description="暂无 Prompt 模板，点击上方按钮创建"
          class="state-box"
        />

        <template v-else>
          <div class="template-grid">
            <NCard
              v-for="tpl in templates"
              :key="tpl.id"
              size="small"
              :class="{ 'selected-card': selectedTemplateId === tpl.id }"
              hoverable
            >
              <template #header>
                <div class="tpl-header">
                  <strong>{{ tpl.name }}</strong>
                  <NSpace :size="4">
                    <NTag size="tiny">{{ PLATFORM_LABEL[tpl.platform] || tpl.platform }}</NTag>
                    <NTag size="tiny" :type="tpl.type === 'image' ? 'warning' : 'info'">{{ tpl.type }}</NTag>
                  </NSpace>
                </div>
              </template>
              <div
                class="tpl-actions"
                @click="loadVersions(tpl.id)"
              >
                <NButton size="tiny" @click.stop="openEdit(tpl)">编辑</NButton>
                <NButton size="tiny" @click.stop="loadVersions(tpl.id)">版本</NButton>
                <NPopconfirm @positive-click="handleDelete(tpl.id)">
                  <template #trigger>
                    <NButton size="tiny" type="error">删除</NButton>
                  </template>
                  确定删除该模板及其所有版本？
                </NPopconfirm>
              </div>
            </NCard>
          </div>

          <!-- 版本列表 -->
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
                  <span class="ver-date">{{ new Date(ver.created_at).toLocaleString() }}</span>
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

      <!-- 创建/编辑弹窗 -->
      <NModal v-model:show="showModal" :title="editing ? '编辑模板' : '新建模板'" preset="card" style="width: 600px">
        <NForm label-placement="top">
          <NFormItem label="模板名称" required>
            <NInput v-model:value="formName" placeholder="例如：小红书通用模板" />
          </NFormItem>
          <NFormItem label="平台">
            <NSelect
              v-model:value="formPlatform"
              :options="PLATFORMS.map((p) => ({ label: PLATFORM_LABEL[p], value: p }))"
            />
          </NFormItem>
          <NFormItem label="类型">
            <NSelect
              v-model:value="formType"
              :options="[{ label: '文字生成', value: 'text' }, { label: '图片生成', value: 'image' }]"
            />
          </NFormItem>
          <NFormItem label="System Prompt" required>
            <NInput
              v-model:value="formSystem"
              type="textarea"
              placeholder="定义 AI 的角色和行为..."
              :autosize="{ minRows: 3, maxRows: 8 }"
            />
          </NFormItem>
          <NFormItem label="User Prompt 模板" required>
            <NInput
              v-model:value="formUser"
              type="textarea"
              placeholder="使用 {{topic}} {{extraRequirements}} 作为变量..."
              :autosize="{ minRows: 4, maxRows: 10 }"
            />
          </NFormItem>
        </NForm>
        <NSpace justify="end" style="margin-top: 16px">
          <NButton @click="showModal = false">取消</NButton>
          <NButton type="primary" :loading="saving" @click="handleSave">保存</NButton>
        </NSpace>
      </NModal>
    </div>
  </DefaultLayout>
</template>

<style scoped>
.prompt-page {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  margin: 0;
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
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.selected-card {
  border-color: #3b82f6 !important;
}

.tpl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tpl-header strong {
  font-size: 14px;
  color: #111827;
}

.tpl-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
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
