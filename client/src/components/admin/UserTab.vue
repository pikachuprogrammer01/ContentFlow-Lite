<script setup lang="ts">
/**
 * UserTab — 用户管理标签页
 *
 * - 超级管理员：可管理所有用户（含 admin），可设置角色
 * - 管理员：只能管理普通用户，不能管理 admin/super_admin
 * - 超级管理员编辑自己时：角色不可更改（任何身份均不可降级自己）
 */

import { ref, onMounted, h, computed } from 'vue';
import {
  NDataTable, NButton, NModal, NSpace, NForm, NFormItem,
  NInput, NSelect, useMessage, NPopconfirm,
} from 'naive-ui';
import type { DataTableColumn, FormInst, FormRules } from 'naive-ui';
import { api } from '@/utils/api-client';
import { useAuthStore } from '@/stores/auth';

const message = useMessage();
const auth = useAuthStore();
const isSuperAdmin = computed(() => auth.user?.role === 'super_admin');
const currentUserId = computed(() => auth.user?.id);

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

const users = ref<AdminUser[]>([]);
const loading = ref(false);

// ── 角色映射 ──────────────────────────────────────────

function roleLabel(role: string): string {
  const map: Record<string, string> = { super_admin: '超级管理员', admin: '管理员', user: '普通用户' };
  return map[role] || role;
}

function roleColor(role: string): string {
  if (role === 'super_admin') return 'color: #dc2626; font-weight: 700';
  if (role === 'admin') return 'color: #3b82f6; font-weight: 600';
  return '';
}

// ── 权限判断 ──────────────────────────────────────────

function isSelf(row: AdminUser): boolean {
  return row.id === currentUserId.value;
}

function canEdit(row: AdminUser): boolean {
  if (isSuperAdmin.value) return true;
  return row.role === 'user';
}

function canDelete(row: AdminUser): boolean {
  if (row.role === 'super_admin') return false;
  if (row.id === currentUserId.value) return false;
  if (row.role === 'admin' && !isSuperAdmin.value) return false;
  return true;
}

// ── 列定义 ────────────────────────────────────────────

const columns: DataTableColumn<AdminUser>[] = [
  { title: '用户名', key: 'username' },
  { title: '邮箱', key: 'email', ellipsis: { tooltip: true } },
  {
    title: '角色', key: 'role', width: 110,
    render: (row) => h('span', { style: roleColor(row.role) }, roleLabel(row.role)),
  },
  {
    title: '注册时间', key: 'createdAt', width: 170,
    render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString() : '—',
  },
  {
    title: '修改时间', key: 'updatedAt', width: 170,
    render: (row) => row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '—',
  },
  {
    title: '操作', key: 'actions', width: 240,
    render: (row) => h('div', { style: 'display: flex; gap: 6px' }, [
      h(NButton, {
        size: 'tiny',
        disabled: !canEdit(row),
        onClick: () => startEdit(row),
      }, { default: () => '编辑' }),
      h(NButton, {
        size: 'tiny',
        disabled: !canEdit(row),
        onClick: () => openResetPwd(row),
      }, { default: () => '重置密码' }),
      canDelete(row)
        ? h(NPopconfirm, { onPositiveClick: () => handleDelete(row.id) }, {
            trigger: () => h(NButton, { size: 'tiny', type: 'error' }, { default: () => '删除' }),
            default: () => '确定删除该用户？',
          })
        : null,
    ]),
  },
];

// ── API ───────────────────────────────────────────────

async function loadUsers(): Promise<void> {
  loading.value = true;
  try {
    users.value = await api.get<AdminUser[]>('/api/admin/users') || [];
  } catch (e: unknown) {
    const err = e as { message?: string };
    message.error(err?.message || '加载失败');
  }
  loading.value = false;
}

// ── 编辑弹窗 ──────────────────────────────────────────

const showEditModal = ref(false);
const editFormRef = ref<FormInst | null>(null);
const editingUser = ref<AdminUser | null>(null);
const editUsername = ref('');
const editEmail = ref('');
const editRole = ref('user');

// 编辑自己时，角色不可改
const roleEditable = computed(() => {
  if (!editingUser.value) return true;
  return editingUser.value.id !== currentUserId.value;
});

const roleOptions = computed(() => {
  const opts: { label: string; value: string }[] = [];
  if (isSuperAdmin.value) {
    opts.push({ label: '管理员', value: 'admin' });
  }
  opts.push({ label: '普通用户', value: 'user' });
  return opts;
});

const editRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 32, message: '用户名长度 2-32 个字符', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_\u4e00-\u9fff]+$/, message: '用户名仅支持字母、数字、下划线、中文', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' },
  ],
};

function startEdit(user: AdminUser): void {
  editingUser.value = user;
  editUsername.value = user.username;
  editEmail.value = user.email;
  editRole.value = user.role;
  showEditModal.value = true;
}

function resetEditForm(): void {
  editingUser.value = null;
  editUsername.value = '';
  editEmail.value = '';
  editRole.value = 'user';
}

async function saveEdit(): Promise<void> {
  if (!editingUser.value) return;
  try {
    await editFormRef.value?.validate();
  } catch {
    return;
  }

  try {
    const body: Record<string, string> = {
      username: editUsername.value,
      email: editEmail.value,
    };
    if (isSuperAdmin.value && roleEditable.value) {
      body.role = editRole.value;
    }
    await api.put(`/api/admin/users/${editingUser.value.id}`, body);
    message.success('已更新');
    showEditModal.value = false;
    resetEditForm();
    await loadUsers();
  } catch (e: unknown) {
    const err = e as { message?: string };
    message.error(err?.message || '更新失败');
  }
}

// ── 重置密码弹窗 ──────────────────────────────────────

const showResetPwdModal = ref(false);
const resetUserId = ref('');
const resetUserName = ref('');
const newPassword = ref('');

function openResetPwd(user: AdminUser): void {
  resetUserId.value = user.id;
  resetUserName.value = user.username;
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
    await loadUsers();
  } catch (e: unknown) {
    const err = e as { message?: string };
    message.error(err?.message || '删除失败');
  }
}

onMounted(loadUsers);
</script>

<template>
  <div>
    <NDataTable
      :columns="columns"
      :data="users"
      :loading="loading"
      :bordered="false"
      :row-key="(row: AdminUser) => row.id"
    />

    <!-- 编辑弹窗 -->
    <NModal
      v-model:show="showEditModal"
      title="编辑用户"
      preset="card"
      style="width: 460px"
      @after-leave="resetEditForm"
    >
      <NForm ref="editFormRef" :model="{ username: editUsername, email: editEmail }" :rules="editRules">
        <NFormItem label="用户名" path="username">
          <NInput v-model:value="editUsername" placeholder="请输入用户名" maxlength="32" />
        </NFormItem>
        <NFormItem label="邮箱" path="email">
          <NInput v-model:value="editEmail" placeholder="请输入邮箱地址" />
        </NFormItem>
        <NFormItem v-if="isSuperAdmin" label="角色">
          <NSelect
            v-model:value="editRole"
            :options="roleOptions"
            :disabled="!roleEditable"
            :placeholder="roleEditable ? '请选择角色' : '不可更改自己的角色'"
          />
          <span v-if="!roleEditable" style="font-size: 12px; color: #999; margin-top: 4px">
            禁止编辑角色
          </span>
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showEditModal = false">取消</NButton>
          <NButton type="primary" @click="saveEdit">保存</NButton>
        </NSpace>
      </template>
    </NModal>

    <!-- 重置密码弹窗 -->
    <NModal v-model:show="showResetPwdModal" title="重置密码" preset="card" style="width: 420px">
      <NForm>
        <NFormItem label="用户">
          <span>{{ resetUserName }}</span>
        </NFormItem>
        <NFormItem label="新密码">
          <NInput
            v-model:value="newPassword"
            type="password"
            placeholder="请输入新密码（至少 6 位）"
            show-password-on="click"
          />
          <span style="font-size: 12px; color: #999; margin-top: 4px">
            至少 6 位，建议包含字母和数字
          </span>
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showResetPwdModal = false">取消</NButton>
          <NButton type="warning" @click="doResetPwd">确认重置</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>
