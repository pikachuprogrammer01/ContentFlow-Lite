<script setup lang="ts">
/**
 * AdminPage — 管理员用户管理
 *
 * 管理员可查看、编辑、删除用户，重置用户密码。
 */

import { ref, onMounted, h } from 'vue';
import {
  NCard,
  NDataTable,
  NButton,
  NModal,
  NSpace,
  NInput,
  NSelect,
  useMessage,
  NPopconfirm,
} from 'naive-ui';
import type { DataTableColumn } from 'naive-ui';
import { api } from '@/utils/api-client';
import DefaultLayout from '@/layouts/DefaultLayout.vue';

const message = useMessage();

// ── 用户列表 ──────────────────────────────────────────

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

const users = ref<AdminUser[]>([]);
const loading = ref(false);

function roleLabel(role: string): string {
  return role === 'admin' ? '管理员' : '普通用户';
}

const columns: DataTableColumn<AdminUser>[] = [
  { title: '用户名', key: 'username' },
  { title: '邮箱', key: 'email' },
  {
    title: '角色',
    key: 'role',
    render: (row) =>
      h(
        'span',
        { style: row.role === 'admin' ? 'color: #3b82f6; font-weight: 600' : '' },
        roleLabel(row.role),
      ),
  },
  {
    title: '注册时间',
    key: 'createdAt',
    render: (row) => new Date(row.createdAt).toLocaleString(),
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    render: (row) =>
      h('div', { style: 'display: flex; gap: 8px' }, [
        h(
          NButton,
          { size: 'tiny', onClick: () => startEdit(row) },
          { default: () => '编辑' },
        ),
        h(
          NButton,
          { size: 'tiny', onClick: () => openResetPwd(row) },
          { default: () => '重置密码' },
        ),
        row.role !== 'admin'
          ? h(
              NPopconfirm,
              { onPositiveClick: () => handleDelete(row.id) },
              {
                trigger: () =>
                  h(NButton, { size: 'tiny', type: 'error' }, { default: () => '删除' }),
                default: () => '确定删除该用户？',
              },
            )
          : null,
      ]),
  },
];

async function loadUsers(): Promise<void> {
  loading.value = true;
  try {
    const res = await api.get<{ data: AdminUser[] }>('/api/admin/users');
    users.value = Array.isArray(res) ? res : (res as any).data || [];
  } catch (e: unknown) {
    const err = e as { message?: string };
    message.error(err?.message || '加载失败');
  }
  loading.value = false;
}

// ── 编辑弹窗 ──────────────────────────────────────────

const showEditModal = ref(false);
const editingUser = ref<AdminUser | null>(null);
const editUsername = ref('');
const editEmail = ref('');
const editRole = ref('user');

function startEdit(user: AdminUser): void {
  editingUser.value = user;
  editUsername.value = user.username;
  editEmail.value = user.email;
  editRole.value = user.role;
  showEditModal.value = true;
}

async function saveEdit(): Promise<void> {
  if (!editingUser.value) return;
  try {
    await api.put(`/api/admin/users/${editingUser.value.id}`, {
      username: editUsername.value,
      email: editEmail.value,
      role: editRole.value,
    });
    message.success('已更新');
    showEditModal.value = false;
    loadUsers();
  } catch (e: unknown) {
    const err = e as { message?: string };
    message.error(err?.message || '更新失败');
  }
}

// ── 重置密码 ──────────────────────────────────────────

const showResetPwdModal = ref(false);
const resetUserId = ref('');
const newPassword = ref('');

function openResetPwd(user: AdminUser): void {
  resetUserId.value = user.id;
  newPassword.value = '';
  showResetPwdModal.value = true;
}

async function doResetPwd(): Promise<void> {
  if (newPassword.value.length < 6) {
    message.warning('密码至少 6 个字符');
    return;
  }
  try {
    await api.post(`/api/admin/users/${resetUserId.value}/reset-password`, {
      newPassword: newPassword.value,
    });
    message.success('密码已重置');
    showResetPwdModal.value = false;
  } catch (e: unknown) {
    const err = e as { message?: string };
    message.error(err?.message || '重置失败');
  }
}

async function handleDelete(id: string): Promise<void> {
  try {
    await api.delete(`/api/admin/users/${id}`);
    message.success('已删除');
    loadUsers();
  } catch (e: unknown) {
    const err = e as { message?: string };
    message.error(err?.message || '删除失败');
  }
}

onMounted(loadUsers);
</script>

<template>
  <DefaultLayout>
    <div class="admin-page">
      <h2>用户管理</h2>

      <NCard>
        <NDataTable
          :columns="columns"
          :data="users"
          :loading="loading"
          :bordered="false"
        />
      </NCard>

      <!-- 编辑弹窗 -->
      <NModal v-model:show="showEditModal" title="编辑用户" preset="card" style="width: 420px">
        <NSpace vertical>
          <NInput v-model:value="editUsername" placeholder="用户名" />
          <NInput v-model:value="editEmail" placeholder="邮箱" />
          <NSelect
            v-model:value="editRole"
            :options="[
              { label: '普通用户', value: 'user' },
              { label: '管理员', value: 'admin' },
            ]"
          />
        </NSpace>
        <NSpace justify="end" style="margin-top: 16px">
          <NButton @click="showEditModal = false">取消</NButton>
          <NButton type="primary" @click="saveEdit">保存</NButton>
        </NSpace>
      </NModal>

      <!-- 重置密码弹窗 -->
      <NModal v-model:show="showResetPwdModal" title="重置密码" preset="card" style="width: 400px">
        <NSpace vertical>
          <NInput
            v-model:value="newPassword"
            type="password"
            placeholder="输入新密码（至少 6 位）"
          />
        </NSpace>
        <NSpace justify="end" style="margin-top: 16px">
          <NButton @click="showResetPwdModal = false">取消</NButton>
          <NButton type="warning" @click="doResetPwd">确认重置</NButton>
        </NSpace>
      </NModal>
    </div>
  </DefaultLayout>
</template>

<style scoped>
.admin-page {
  max-width: 900px;
  margin: 0 auto;
}

h2 {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 24px;
}
</style>
