<script setup lang="ts">
/**
 * ProfilePage — 用户个人信息页
 *
 * 展示从 GET /api/auth/me 获取的用户基本信息。
 */

import { NCard, NAvatar, NDescriptions, NDescriptionsItem, NButton, NSpace, NDivider } from 'naive-ui';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import DefaultLayout from '@/layouts/DefaultLayout.vue';

const router = useRouter();
const auth = useAuthStore();

function handleLogout(): void {
  auth.logout();
  router.push('/login');
}
</script>

<template>
  <DefaultLayout>
    <div class="profile-page">
      <h2>个人信息</h2>

      <NCard class="profile-card">
        <!-- 头像区 -->
        <div class="avatar-area">
          <NAvatar
            size="large"
            round
            :style="{ backgroundColor: '#3b82f6', fontSize: '28px' }"
          >
            {{ auth.user?.username?.charAt(0).toUpperCase() }}
          </NAvatar>
          <div class="avatar-info">
            <h3>{{ auth.user?.username }}</h3>
            <span class="role-badge">{{ auth.user?.role === 'admin' ? '管理员' : '普通用户' }}</span>
          </div>
        </div>

        <NDivider />

        <!-- 详细信息 -->
        <NDescriptions label-placement="left" :column="1">
          <NDescriptionsItem label="用户名">
            {{ auth.user?.username }}
          </NDescriptionsItem>
          <NDescriptionsItem label="邮箱">
            {{ auth.user?.email }}
          </NDescriptionsItem>
          <NDescriptionsItem label="角色">
            {{ auth.user?.role === 'admin' ? '管理员' : '普通用户' }}
          </NDescriptionsItem>
          <NDescriptionsItem label="注册时间">
            {{ auth.user?.createdAt ? new Date(auth.user.createdAt).toLocaleString() : '—' }}
          </NDescriptionsItem>
          <NDescriptionsItem label="用户 ID">
            <code>{{ auth.user?.id }}</code>
          </NDescriptionsItem>
        </NDescriptions>

        <NDivider />

        <!-- 操作区 -->
        <NSpace justify="end">
          <NButton type="error" @click="handleLogout">退出登录</NButton>
        </NSpace>
      </NCard>
    </div>
  </DefaultLayout>
</template>

<style scoped>
.profile-page {
  max-width: 560px;
  margin: 0 auto;
}

h2 {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 24px;
}

.profile-card {
  padding: 8px;
}

.avatar-area {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
}

.avatar-info h3 {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 4px;
}

.role-badge {
  font-size: 12px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 10px;
  border-radius: 10px;
}

code {
  font-size: 12px;
  color: #6b7280;
  background: #f9fafb;
  padding: 2px 6px;
  border-radius: 4px;
  word-break: break-all;
}
</style>
