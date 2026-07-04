<script setup lang="ts">
/**
 * PromptTemplateTab — Prompt 模板管理标签页
 * 超级管理员支持批量选择和批量删除。
 */

import { ref, onMounted, h, computed } from 'vue';
import { NDataTable, NButton, NPopconfirm, NSpace, useMessage } from 'naive-ui';
import type { DataTableColumn, DataTableRowKey } from 'naive-ui';
import { api } from '@/utils/api-client';
import { platformLabel } from '@/utils/platform';
import { useAuthStore } from '@/stores/auth';

const message = useMessage();
const auth = useAuthStore();
const isSuperAdmin = computed(() => auth.user?.role === 'super_admin');

interface PromptTemplate {
  id: string;
  userId: string;
  name: string;
  type: string;
  platform: string;
  isDefault: boolean;
  updatedAt: string;
}

const items = ref<PromptTemplate[]>([]);
const loading = ref(false);
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const checkedRowKeys = ref<DataTableRowKey[]>([]);

const typeCol: DataTableColumn<PromptTemplate> = { type: 'selection' };

const columns: DataTableColumn<PromptTemplate>[] = [
  { title: 'ID', key: 'id', width: 120, ellipsis: { tooltip: true } },
  { title: '用户', key: 'userId', width: 120, ellipsis: { tooltip: true } },
  { title: '名称', key: 'name', ellipsis: { tooltip: true } },
  {
    title: '类型', key: 'type', width: 60,
    render: (row) => row.type === 'text' ? '文字' : '图片',
  },
  { title: '平台/风格', key: 'platform', width: 100, render: (row) => platformLabel(row.platform) },
  {
    title: '默认', key: 'isDefault', width: 50,
    render: (row) => row.isDefault ? '✓' : '',
  },
  {
    title: '更新时间', key: 'updatedAt', width: 160,
    render: (row) => new Date(row.updatedAt).toLocaleString(),
  },
  {
    title: '操作', key: 'actions', width: 80,
    render: (row) =>
      h(NPopconfirm, { onPositiveClick: () => handleDelete(row.id) }, {
        trigger: () => h(NButton, { size: 'tiny', type: 'error' }, { default: () => '删除' }),
        default: () => '确定删除该模板及其所有版本？',
      }),
  },
];

const displayColumns = computed(() => isSuperAdmin.value ? [typeCol, ...columns] : columns);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await api.get<{ data: { items: PromptTemplate[]; pagination: { total: number } } }>(
      `/api/admin/prompt-templates?page=${page.value}&limit=${limit.value}`,
    );
    const d = (res as any).data || res;
    items.value = d.items || [];
    total.value = d.pagination?.total || 0;
  } catch (e: unknown) {
    const err = e as { message?: string };
    message.error(err?.message || '加载失败');
  }
  loading.value = false;
}

async function handleDelete(id: string): Promise<void> {
  try {
    await api.delete(`/api/admin/prompt-templates/${id}`);
    message.success('已删除');
    checkedRowKeys.value = [];
    load();
  } catch (e: unknown) {
    const err = e as { message?: string };
    message.error(err?.message || '删除失败');
  }
}

async function handleBatchDelete(): Promise<void> {
  try {
    await api.post('/api/admin/prompt-templates/batch-delete', { ids: checkedRowKeys.value });
    message.success(`已删除 ${checkedRowKeys.value.length} 个模板`);
    checkedRowKeys.value = [];
    load();
  } catch (e: unknown) {
    const err = e as { message?: string };
    message.error(err?.message || '批量删除失败');
  }
}

function handleCheck(rowKeys: DataTableRowKey[]): void {
  checkedRowKeys.value = rowKeys;
}

function onPageChange(p: number): void {
  page.value = p;
  checkedRowKeys.value = [];
  load();
}

function onPageSizeChange(ps: number): void {
  limit.value = ps;
  page.value = 1;
  checkedRowKeys.value = [];
  load();
}

onMounted(load);
</script>

<template>
  <div>
    <NSpace v-if="isSuperAdmin && checkedRowKeys.length > 0" style="margin-bottom: 12px">
      <span style="color: #666">已选 {{ checkedRowKeys.length }} 项</span>
      <NPopconfirm @positive-click="handleBatchDelete">
        <template #trigger>
          <NButton size="small" type="error">批量删除</NButton>
        </template>
        确定删除选中的 {{ checkedRowKeys.length }} 个模板及其所有版本？
      </NPopconfirm>
    </NSpace>
    <NDataTable
      :columns="displayColumns"
      :data="items"
      :loading="loading"
      :bordered="false"
      :row-key="(row: PromptTemplate) => row.id"
      :checked-row-keys="checkedRowKeys"
      @update:checked-row-keys="handleCheck"
      :pagination="{
        page: page, pageSize: limit, itemCount: total,
        showSizePicker: true,
        pageSizes: [10, 20, 50, 100],
        onChange: onPageChange,
      }"
      @update:page-size="onPageSizeChange"
    />
  </div>
</template>
