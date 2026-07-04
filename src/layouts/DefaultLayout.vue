<script setup lang="ts">
/**
 * 默认布局 — Naive UI 顶部导航 + 内容区 + 用户信息
 */
import { NLayout, NLayoutHeader, NLayoutContent, NMenu, NSpace, NButton, NText, NTag, NAvatar, useDialog } from 'naive-ui';
import { useRouter, useRoute } from 'vue-router';
import { computed } from 'vue';
import type { MenuOption } from 'naive-ui';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const dialog = useDialog();

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
  dialog.warning({
    title: '确认退出',
    content: '退出登录后需要重新输入账号密码。确定要退出吗？',
    positiveText: '确认退出',
    negativeText: '取消',
    onPositiveClick: () => {
      auth.logout();
      router.push('/login');
    },
  });
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
        <div v-if="auth.user" class="user-area">
          <NAvatar size="small" round>{{ auth.user.username.charAt(0).toUpperCase() }}</NAvatar>
          <NText class="user-name">{{ auth.user.username }}</NText>
          <NButton size="tiny" quaternary type="error" @click="handleLogout">退出</NButton>
        </div>
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

.user-area {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border-radius: 8px;
  background: #f5f7fa;
}

.user-name {
  font-size: 13px;
  color: #374151;
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
