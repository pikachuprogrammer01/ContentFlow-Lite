<script setup lang="ts">
/**
 * AdminPage — 管理面板（管理员/超级管理员）
 *
 * Tab 切换：用户管理 | 内容管理 | 生成记录 | Prompt 模板 | Prompt 版本
 */

import { ref } from 'vue';
import { NCard, NTabs, NTabPane } from 'naive-ui';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import UserTab from '@/components/admin/UserTab.vue';
import ContentTab from '@/components/admin/ContentTab.vue';
import GenerationTab from '@/components/admin/GenerationTab.vue';
import PromptTemplateTab from '@/components/admin/PromptTemplateTab.vue';
import PromptVersionTab from '@/components/admin/PromptVersionTab.vue';

const activeTab = ref('users');
</script>

<template>
  <DefaultLayout>
    <div class="admin-page">
      <h2>管理面板</h2>

      <NCard content-style="padding: 0">
        <NTabs v-model:value="activeTab" type="line" animated>
          <NTabPane name="users" tab="用户管理">
            <div class="tab-content">
              <UserTab />
            </div>
          </NTabPane>

          <NTabPane name="contents" tab="内容管理">
            <div class="tab-content">
              <ContentTab />
            </div>
          </NTabPane>

          <NTabPane name="generations" tab="生成记录">
            <div class="tab-content">
              <GenerationTab />
            </div>
          </NTabPane>

          <NTabPane name="prompt-templates" tab="Prompt 模板">
            <div class="tab-content">
              <PromptTemplateTab />
            </div>
          </NTabPane>

          <NTabPane name="prompt-versions" tab="Prompt 版本">
            <div class="tab-content">
              <PromptVersionTab />
            </div>
          </NTabPane>
        </NTabs>
      </NCard>
    </div>
  </DefaultLayout>
</template>

<style scoped>
.admin-page {
  max-width: 1100px;
  margin: 0 auto;
}

h2 {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 24px;
}

.tab-content {
  padding: 16px 0;
}
</style>
