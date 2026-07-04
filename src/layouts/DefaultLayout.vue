<script setup lang="ts">
/**
 * 默认布局 — Naive UI 顶部导航 + 内容区 + 用户信息
 */
import { NLayout, NLayoutHeader, NLayoutContent, NMenu, NSpace, NButton, NText, NTag } from 'naive-ui';
import { useRouter, useRoute } from 'vue-router';
import { computed } from 'vue';
import type { MenuOption } from 'naive-ui';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const menuOptions: MenuOption[] = [
  { label: '生成', key: 'home' },
  { label: '历史', key: 'history' },
  { label: 'Prompt', key: 'prompt' },
];

const activeKey = computed(() => {
  const name = String(route.name || 'home');
  return name;
});

function handleMenuUpdate(key: string): void {
  router.push({ name: key });
}

function handleLogout(): void {
  auth.logout();
  router.push('/login');
}
</script>

<template>
  <NLayout class="app-layout">
    <NLayoutHeader bordered>
      <div class="header-inner">
        <router-link to="/" class="logo-link">
          <NText strong style="font-size: 18px">ContentFlow Lite</NText>
        </router-link>
        <NMenu
          :value="activeKey"
          :options="menuOptions"
          mode="horizontal"
          style="flex: 1"
          @update:value="handleMenuUpdate"
        />
        <NSpace align="center" v-if="auth.user">
          <NTag size="small" type="info">{{ auth.user.username }}</NTag>
          <NButton size="small" text @click="handleLogout">退出</NButton>
        </NSpace>
      </div>
    </NLayoutHeader>
    <NLayoutContent>
      <div class="main-content">
        <slot />
      </div>
    </NLayoutContent>
  </NLayout>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 0 24px;
}

.logo-link {
  text-decoration: none;
  white-space: nowrap;
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
