<script setup lang="ts">
/**
 * HomePage — 输入主题，选择平台和 Provider，生成内容
 *
 * 职责：收集用户输入 → POST /api/generate → 跳转编辑页
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
  NSpace,
  NCard,
  NTag,
  NGrid,
  NGi,
} from 'naive-ui';
import { useContentStore } from '@/stores/content';
import { useAuthStore } from '@/stores/auth';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import type { Platform } from '@/types';

const router = useRouter();
const store = useContentStore();
const auth = useAuthStore();

// ── 表单 ──────────────────────────────────────────────

const topic = ref('');
const platform = ref<Platform>('xiaohongshu');
const provider = ref('mock');
const extraRequirements = ref('');

const platformOptions = [
  { label: '📕 小红书', value: 'xiaohongshu' },
  { label: '💬 公众号', value: 'wechat' },
  { label: '🤔 知乎', value: 'zhihu' },
  { label: '🎵 抖音', value: 'douyin' },
  { label: '📺 B站', value: 'bilibili' },
  { label: '📰 头条', value: 'toutiao' },
] as const;

const providerOptions = [
  { label: '🧪 Mock（开发测试）', value: 'mock' },
  { label: '🧠 Gemini 2.0 Flash', value: 'gemini' },
  { label: '🚀 DeepSeek V4 Flash', value: 'deepseek' },
] as const;

const suggestionTopics = [
  { label: '春日穿搭', icon: '👗' },
  { label: '周末去哪玩', icon: '🌿' },
  { label: '新手护肤指南', icon: '✨' },
  { label: '高效学习法', icon: '📚' },
  { label: '数码好物推荐', icon: '💻' },
  { label: '减脂餐食谱', icon: '🥗' },
];

const canGenerate = computed(() => topic.value.trim().length > 0 && !store.loading);

// ── 方法 ──────────────────────────────────────────────

function pickSuggestion(label: string): void {
  topic.value = label;
}

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
  <DefaultLayout>
    <div class="home-page">
    <!-- 欢迎区 -->
    <div class="hero">
      <p class="greeting">
        {{ auth.user ? `👋 你好，${auth.user.username}` : '👋 欢迎使用' }}
      </p>
      <h2>一键生成多平台内容</h2>
      <p class="subtitle">输入一个主题，AI 自动为你生成适配小红书、抖音等平台的图文内容</p>

      <!-- 三步引导 -->
      <div class="steps">
        <div class="step">
          <span class="step-num">1</span>
          <span>输入主题</span>
        </div>
        <span class="step-arrow">→</span>
        <div class="step">
          <span class="step-num">2</span>
          <span>选择平台</span>
        </div>
        <span class="step-arrow">→</span>
        <div class="step">
          <span class="step-num">3</span>
          <span>一键生成</span>
        </div>
      </div>
    </div>

    <!-- 快捷主题 -->
    <div class="suggestions">
      <p class="suggest-label">💡 试试这些主题：</p>
      <NSpace>
        <NTag
          v-for="item in suggestionTopics"
          :key="item.label"
          checkable
          :checked="topic === item.label"
          size="medium"
          @click="pickSuggestion(item.label)"
        >
          {{ item.icon }} {{ item.label }}
        </NTag>
      </NSpace>
    </div>

    <!-- 输入卡片 -->
    <NCard class="input-card">
      <NForm label-placement="top" size="large">
        <NFormItem label="📝 主题" required>
          <NInput
            v-model:value="topic"
            placeholder="输入你想写的内容主题..."
            :disabled="store.loading"
            size="large"
            @keyup.enter="handleGenerate"
          />
        </NFormItem>

        <NGrid :cols="2" :x-gap="16">
          <NGi>
            <NFormItem label="📱 目标平台">
              <NSelect
                v-model:value="platform"
                :options="platformOptions"
                :disabled="store.loading"
              />
            </NFormItem>
          </NGi>
          <NGi>
            <NFormItem label="🤖 AI 模型">
              <NSelect
                v-model:value="provider"
                :options="providerOptions"
                :disabled="store.loading"
              />
            </NFormItem>
          </NGi>
        </NGrid>

        <NFormItem label="📋 补充要求（可选）">
          <NInput
            v-model:value="extraRequirements"
            type="textarea"
            placeholder="例如：语气轻松幽默、面向年轻女性、控制在 500 字以内..."
            :disabled="store.loading"
            :autosize="{ minRows: 2, maxRows: 4 }"
          />
        </NFormItem>

        <NButton
          type="primary"
          block
          size="large"
          :disabled="!canGenerate"
          :loading="store.loading"
          style="margin-top: 8px"
          @click="handleGenerate"
        >
          {{ store.loading ? '✨ AI 正在生成中...' : '🚀 开始生成' }}
        </NButton>
      </NForm>

      <!-- 错误提示 -->
      <NAlert
        v-if="store.error"
        type="error"
        title="生成失败"
        closable
        style="margin-top: 16px"
        @close="store.clearError"
      >
        <template #default>
          <p style="margin: 0">{{ store.error.message }}</p>
          <p style="margin: 4px 0 0; color: #999; font-size: 12px">
            错误码：{{ store.error.code }} · 节点：{{ store.error.node }}
          </p>
        </template>
      </NAlert>
    </NCard>
    </div>
  </DefaultLayout>
</template>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 32px;
}

/* ── 欢迎区 ────────────────────────────────────────── */

.hero {
  text-align: center;
  margin-bottom: 28px;
}

.greeting {
  font-size: 14px;
  color: #9ca3af;
  margin: 0 0 4px;
}

.hero h2 {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px;
}

.subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 20px;
  max-width: 420px;
  line-height: 1.6;
}

/* ── 三步引导 ──────────────────────────────────────── */

.steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 4px;
}

.step {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b7280;
}

.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #eff6ff;
  color: #3b82f6;
  font-size: 12px;
  font-weight: 700;
}

.step-arrow {
  color: #d1d5db;
  font-size: 14px;
}

/* ── 快捷主题 ──────────────────────────────────────── */

.suggestions {
  text-align: center;
  margin-bottom: 20px;
}

.suggest-label {
  font-size: 13px;
  color: #9ca3af;
  margin: 0 0 8px;
}

/* ── 输入卡片 ──────────────────────────────────────── */

.input-card {
  width: 100%;
  max-width: 600px;
}
</style>
