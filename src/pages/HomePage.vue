<script setup lang="ts">
/**
 * 首页 — 输入主题，生成内容
 *
 * 职责：收集用户输入 → 调用 Workflow → 展示结果
 * 禁止：拼接 Prompt / 调用 AI / 解析 JSON
 */

import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useContentStore } from '@/stores/content';
import { PLATFORMS, PLATFORM_LABELS, DEFAULT_PLATFORM } from '@/constants';
import type { Platform } from '@/constants';
import DefaultLayout from '@/layouts/DefaultLayout.vue';

const router = useRouter();
const store = useContentStore();

const topic = ref('');
const platform = ref<Platform>(DEFAULT_PLATFORM);
const extraRequirements = ref('');

const canGenerate = computed(() => topic.value.trim().length > 0 && !store.loading);

async function handleGenerate(): Promise<void> {
  if (!canGenerate.value) return;

  const success = await store.generate({
    topic: topic.value.trim(),
    platform: platform.value,
    promptId: `${platform.value}_default`,
    promptVersion: 'v1.0.0',
    extraRequirements: extraRequirements.value.trim() || undefined,
  });

  if (success) {
    router.push(`/edit/${store.currentContent.id}`);
  }
}
</script>

<template>
  <DefaultLayout>
    <div class="home-page">
      <div class="hero">
        <h2>输入主题，一键生成图文内容</h2>
        <p>基于 AI 的内容生成工具，适合小红书、抖音等平台的内容创作者。</p>
      </div>

      <div class="input-card">
        <div class="form-group">
          <label for="topic">主题</label>
          <input
            id="topic"
            v-model="topic"
            type="text"
            placeholder="例如：武功山喝什么、周末去哪玩..."
            :disabled="store.loading"
            @keyup.enter="handleGenerate"
          />
        </div>

        <div class="form-group">
          <label for="platform">目标平台</label>
          <select id="platform" v-model="platform" :disabled="store.loading">
            <option
              v-for="p in PLATFORMS"
              :key="p"
              :value="p"
            >
              {{ PLATFORM_LABELS[p] }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label for="extra">补充要求（可选）</label>
          <textarea
            id="extra"
            v-model="extraRequirements"
            rows="3"
            placeholder="例如：内容风格轻松幽默、目标受众是年轻人..."
            :disabled="store.loading"
          />
        </div>

        <button
          class="btn-generate"
          :disabled="!canGenerate"
          @click="handleGenerate"
        >
          <template v-if="store.loading">
            <span class="spinner" />
            生成中...
          </template>
          <template v-else>
            开始生成
          </template>
        </button>

        <!-- 错误提示 -->
        <div v-if="store.error" class="error-box">
          <p class="error-title">生成失败</p>
          <p class="error-message">{{ store.error.message }}</p>
          <p class="error-detail">错误码：{{ store.error.code }} · 节点：{{ store.error.node }}</p>
        </div>
      </div>
    </div>
  </DefaultLayout>
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
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  color: #111827;
  background: #f9fafb;
  outline: none;
  transition: border-color 0.15s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: #3b82f6;
  background: #ffffff;
}

.form-group textarea {
  resize: vertical;
}

.btn-generate {
  padding: 12px 24px;
  background: #3b82f6;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.15s;
}

.btn-generate:hover:not(:disabled) {
  background: #2563eb;
}

.btn-generate:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-box {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 14px 16px;
}

.error-title {
  font-size: 14px;
  font-weight: 600;
  color: #dc2626;
  margin: 0 0 4px;
}

.error-message {
  font-size: 13px;
  color: #b91c1c;
  margin: 0 0 4px;
}

.error-detail {
  font-size: 12px;
  color: #9ca3af;
  margin: 0;
}
</style>
