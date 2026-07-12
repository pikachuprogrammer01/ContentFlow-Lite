<script setup lang="ts">
/**
 * ProfilePage — 用户个人信息页（可编辑）
 *
 * 支持修改用户名和邮箱，通过 PUT /api/auth/me 提交。
 */

import { computed, ref,onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  NCard,
  NAvatar,
  NDescriptions,
  NDescriptionsItem,
  NButton,
  NSpace,
  NDivider,
  NInput,
  useMessage,
} from 'naive-ui';
import { api } from '@/utils/api-client';
import type { UserInfo } from '@/types';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const message = useMessage();
const auth = useAuthStore();

onMounted(async () => {
  await auth.fetchUser().catch((err) => {
    message.error(err?.message || '获取用户信息失败');
  });
})

const createdAt = computed(() => {
  if (!auth.user?.createdAt) return '-';
  return new Date(auth.user?.createdAt).toLocaleString();
})
// ── 编辑状态 ──────────────────────────────────────────

const editing = ref(false);
const saving = ref(false);
const editUsername = ref('');
const editEmail = ref('');

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    super_admin: '超级管理员',
    admin: '管理员',
    user: '普通用户',
  };
  return map[role] || role;
}

function startEdit(): void {
  editUsername.value = auth.user?.username || '';
  editEmail.value = auth.user?.email || '';
  editing.value = true;
}

function cancelEdit(): void {
  editing.value = false;
}

async function saveProfile(): Promise<void> {
  if (!editUsername.value.trim() || !editEmail.value.trim()) {
    message.warning('用户名和邮箱不能为空');
    return;
  }
  saving.value = true;
  try {
    const res = await api.put<{ user: UserInfo }>('/api/auth/me', {
      username: editUsername.value.trim(),
      email: editEmail.value.trim(),
    });
    auth.user = res.user;
    editing.value = false;
    message.success('个人信息已更新');
  } catch (e: unknown) {
    const err = e as { message?: string };
    message.error(err?.message || '更新失败');
  } finally {
    saving.value = false;
  }
}

function goBack(): void {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/');
  }
}

function handleLogout(): void {
  auth.logout();
  router.push('/login');
}
</script>

<template>
  <DefaultLayout>
    <div class="profile-page">
      <div class="page-header">
        <NButton text @click="goBack">← 返回</NButton>
        <h2>个人信息</h2>
      </div>

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
            <h3 v-if="!editing">{{ auth.user?.username }}</h3>
            <span class="role-badge">{{ roleLabel(auth.user?.role || 'user') }}</span>
          </div>
        </div>

        <NDivider />

        <!-- 编辑模式 -->
        <template v-if="editing">
          <div class="edit-row">
            <span class="edit-label">用户名</span>
            <NInput v-model:value="editUsername" />
          </div>
          <div class="edit-row">
            <span class="edit-label">邮　箱</span>
            <NInput v-model:value="editEmail" />
          </div>
          <NSpace justify="end" style="margin-top: 16px">
            <NButton @click="cancelEdit">取消</NButton>
            <NButton type="primary" :loading="saving" @click="saveProfile">保存</NButton>
          </NSpace>
        </template>

        <!-- 展示模式 -->
        <template v-else>
          <NDescriptions label-placement="left" :column="1">
            <NDescriptionsItem label="用户名">
              {{ auth.user?.username }}
            </NDescriptionsItem>
            <NDescriptionsItem label="邮箱">
              {{ auth.user?.email }}
            </NDescriptionsItem>
            <NDescriptionsItem label="角色">
              {{ roleLabel(auth.user?.role || 'user') }}
            </NDescriptionsItem>
            <NDescriptionsItem label="注册时间">
              {{ createdAt }}
              <!-- {{ auth }} -->
            </NDescriptionsItem>
            <NDescriptionsItem label="用户 ID">
              <code>{{ auth.user?.id }}</code>
            </NDescriptionsItem>
          </NDescriptions>

          <NDivider />

          <NSpace justify="end">
            <NButton @click="startEdit">编辑信息</NButton>
            <NButton type="error" @click="handleLogout">退出登录</NButton>
          </NSpace>
        </template>
      </NCard>
    </div>
  </DefaultLayout>
</template>

<style scoped>
.profile-page {
  max-width: 560px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  margin: 0;
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
