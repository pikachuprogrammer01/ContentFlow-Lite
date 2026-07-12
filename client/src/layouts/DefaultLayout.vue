<script setup lang="ts">
/**
 * 默认布局 — Naive UI 顶部导航 + 内容区 + 用户下拉菜单
 */
import {
  NLayout,
  NLayoutHeader,
  NLayoutContent,
  NMenu,
  NText,
  NAvatar,
  NDropdown,
  useDialog,
} from 'naive-ui';
import { useRouter, useRoute } from 'vue-router';
import { computed } from 'vue';
import type { MenuOption, DropdownOption } from 'naive-ui';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const dialog = useDialog();

const menuOptions = computed<MenuOption[]>(() => {
  const items: MenuOption[] = [
    { label: '生成', key: 'home' },
    { label: '历史', key: 'history' },
    { label: 'Prompt', key: 'prompt' },
  ];
  if (auth.user?.role === 'admin' || auth.user?.role === 'super_admin') {
    items.push({ label: '管理', key: 'admin' });
  }
  return items;
});

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

const userDropdownOptions: DropdownOption[] = [
  {
    label: '个人信息',
    key: 'profile',
  },
  {
    type: 'divider',
    key: 'div',
  },
  {
    label: '退出登录',
    key: 'logout',
  },
];

function handleUserDropdown(key: string): void {
  if (key === 'profile') {
    router.push('/profile');
  } else if (key === 'logout') {
    handleLogout();
  }
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
        <NDropdown
          v-if="auth.user"
          trigger="click"
          :options="userDropdownOptions"
          @select="handleUserDropdown"
        >
          <div class="user-trigger">
            <NAvatar
              size="small"
              round
              :style="{ backgroundColor: '#3b82f6' }"
            >
              {{ auth.user.username.charAt(0).toUpperCase() }}
            </NAvatar>
            <span class="user-name">{{ auth.user.username }}</span>
            <span class="arrow">▾</span>
          </div>
        </NDropdown>
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

.user-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 4px 6px;
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
}

.user-trigger:hover {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.user-name {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
}

.arrow {
  font-size: 10px;
  color: #9ca3af;
  margin-left: -2px;
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
