<script setup lang="ts">
/**
 * HomePage — 输入主题，选择平台和 Provider，生成内容
 *
 * 职责：收集用户输入 → POST /api/generate → 展示结果
 * 禁止：拼接 Prompt / 调用 AI / 解析 JSON
 */

import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  NButton,
  NInput,
  NSelect,
  NForm,
  NFormItem,
  NAlert,
  NSpin,
  NSpace,
  NCard,
} from 'naive-ui';
import { useContentStore } from '@/stores/content';
import type { Platform } from '@/types';

const router = useRouter();
const store = useContentStore();

// ── 表单 ──────────────────────────────────────────────

const topic = ref('');
const platform = ref<Platform>('xiaohongshu');
const provider = ref('mock');
const extraRequirements = ref('');

const platformOptions = [
  { label: '小红书', value: 'xiaohongshu' },
  { label: '公众号', value: 'wechat' },
  { label: '知乎', value: 'zhihu' },
  { label: '抖音', value: 'douyin' },
  { label: 'B站', value: 'bilibili' },
  { label: '头条', value: 'toutiao' },
] as const;

const providerOptions = [
  { label: 'Mock（开发测试）', value: 'mock' },
  { label: 'Gemini 2.0 Flash', value: 'gemini' },
  { label: 'DeepSeek V4 Flash', value: 'deepseek' },
] as const;

const canGenerate = computed(() => topic.value.trim().length > 0 && !store.loading);

// ── 方法 ──────────────────────────────────────────────

async function handleGenerate(): Promise<void> {
  if (!canGenerate.value) return;

  const success = await store.generate({
    topic: topic.value.trim(),
    platform: platform.value,
    provider: provider.value,
    extraRequirements: extraRequirements.value.trim() || undefined,
  });

  if (success && store.currentContent.id) {
    router.push(`/edit/${store.currentContent.id}`);
  }
}
</script>

<template>
  <div class="home-page">
    <div class="hero">
      <h2>输入主题，一键生成图文内容</h2>
      <p>基于 AI 的内容生成工具，适合小红书、抖音等平台的内容创作者。</p>
    </div>

    <NCard class="input-card">
      <NForm label-placement="top">
        <NFormItem label="主题" required>
          <NInput
            v-model:value="topic"
            placeholder="例如：武功山喝什么、周末去哪玩..."
            :disabled="store.loading"
            size="large"
            @keyup.enter="handleGenerate"
          />
        </NFormItem>

        <NFormItem label="目标平台">
          <NSelect
            v-model:value="platform"
            :options="platformOptions"
            :disabled="store.loading"
          />
        </NFormItem>

        <NFormItem label="AI 模型">
          <NSelect
            v-model:value="provider"
            :options="providerOptions"
            :disabled="store.loading"
          />
        </NFormItem>

        <NFormItem label="补充要求（可选）">
          <NInput
            v-model:value="extraRequirements"
            type="textarea"
            placeholder="例如：内容风格轻松幽默、目标受众是年轻人..."
            :disabled="store.loading"
            :autosize="{ minRows: 3, maxRows: 6 }"
          />
        </NFormItem>

        <NButton
          type="primary"
          block
          size="large"
          :disabled="!canGenerate"
          :loading="store.loading"
          @click="handleGenerate"
        >
          {{ store.loading ? '生成中...' : '开始生成' }}
        </NButton>
      </NForm>

      <!-- 错误提示 -->
      <NSpace v-if="store.error" vertical style="margin-top: 16px">
        <NAlert
          type="error"
          title="生成失败"
          closable
          @close="store.clearError"
        >
          <template #default>
            <p>{{ store.error.message }}</p>
            <p style="color: #999; font-size: 12px">
              错误码：{{ store.error.code }} · 节点：{{ store.error.node }}
            </p>
          </template>
        </NAlert>
      </NSpace>
    </NCard>
  </div>
</template>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 40px;
}

.hero {
  text-align: center;
  margin-bottom: 32px;
}

.hero h2 {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px;
}

.hero p {
  font-size: 15px;
  color: #6b7280;
  margin: 0;
}

.input-card {
  width: 100%;
  max-width: 560px;
}
</style>
