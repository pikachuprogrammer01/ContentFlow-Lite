<script setup lang="ts">
/**
 * ContentTab — 内容管理标签页
 * 管理员/超级管理员可查看所有用户的内容并删除。
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

interface ContentItem {
  id: string;
  userId: string;
  topic: string;
  platform: string;
  tags: string[];
  titleCount: number;
  pageCount: number;
  createdAt: string;
}

const items = ref<ContentItem[]>([]);
const loading = ref(false);
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const checkedRowKeys = ref<DataTableRowKey[]>([]);

const typeCol: DataTableColumn<ContentItem> = {
  type: 'selection',
};

const columns: DataTableColumn<ContentItem>[] = [
  { title: 'ID', key: 'id', width: 120, ellipsis: { tooltip: true } },
  { title: '用户', key: 'userId', width: 120, ellipsis: { tooltip: true } },
  { title: '主题', key: 'topic', ellipsis: { tooltip: true } },
  { title: '平台', key: 'platform', width: 80, render: (row) => platformLabel(row.platform) },
  {
    title: '标签', key: 'tags', width: 120,
    render: (row) => row.tags?.slice(0, 3).join(', ') || '—',
  },
  { title: '标题/页数', key: 'counts', width: 90, render: (row) => `${row.titleCount}/${row.pageCount}` },
  {
    title: '创建时间', key: 'createdAt', width: 160,
    render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString() : '—',
  },
  {
    title: '操作', key: 'actions', width: 80,
    render: (row) =>
      h(NPopconfirm, { onPositiveClick: () => handleDelete(row.id) }, {
        trigger: () => h(NButton, { size: 'tiny', type: 'error' }, { default: () => '删除' }),
        default: () => '确定删除该内容？',
      }),
  },
];

const displayColumns = computed(() => isSuperAdmin.value ? [typeCol, ...columns] : columns);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await api.get<{ items: ContentItem[]; pagination: { total: number } }>(
      `/api/admin/contents?page=${page.value}&limit=${limit.value}`,
    );
    items.value = res.items || [];
    total.value = res.pagination?.total || 0;
  } catch (e: unknown) {
    const err = e as { message?: string };
    message.error(err?.message || '加载失败');
  }
  loading.value = false;
}

async function handleDelete(id: string): Promise<void> {
  try {
    await api.delete(`/api/admin/contents/${id}`);
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
    await api.post('/api/admin/contents/batch-delete', { ids: checkedRowKeys.value });
    message.success(`已删除 ${checkedRowKeys.value.length} 条内容`);
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
        确定删除选中的 {{ checkedRowKeys.length }} 条内容？
      </NPopconfirm>
    </NSpace>
    <NDataTable
      :columns="displayColumns"
      :data="items"
      :loading="loading"
      :bordered="false"
      :row-key="(row: ContentItem) => row.id"
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
