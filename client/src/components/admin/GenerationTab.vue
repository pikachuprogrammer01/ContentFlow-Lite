<script setup lang="ts">
/**
 * GenerationTab — 生成记录管理标签页（只读）
 * 超级管理员支持批量删除和清空全部记录。
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

interface GenRecord {
  id: string;
  userId: string;
  contentId: string;
  topic: string;
  platform: string;
  promptId: string;
  promptVersion: string;
  model: string;
  createdAt: string;
}

const items = ref<GenRecord[]>([]);
const loading = ref(false);
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const checkedRowKeys = ref<DataTableRowKey[]>([]);

const typeCol: DataTableColumn<GenRecord> = { type: 'selection' };

const columns: DataTableColumn<GenRecord>[] = [
  { title: 'ID', key: 'id', width: 120, ellipsis: { tooltip: true } },
  { title: '用户', key: 'userId', width: 120, ellipsis: { tooltip: true } },
  { title: '内容ID', key: 'contentId', width: 120, ellipsis: { tooltip: true } },
  { title: '主题', key: 'topic', ellipsis: { tooltip: true } },
  { title: '平台', key: 'platform', width: 70, render: (row) => platformLabel(row.platform) },
  { title: 'Prompt ID', key: 'promptId', width: 100, ellipsis: { tooltip: true } },
  { title: '版本', key: 'promptVersion', width: 60 },
  { title: '模型', key: 'model', width: 120 },
  {
    title: '时间', key: 'createdAt', width: 160,
    render: (row) => new Date(row.createdAt).toLocaleString(),
  },
];

const displayColumns = computed(() => isSuperAdmin.value ? [typeCol, ...columns] : columns);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await api.get<{ data: { items: GenRecord[]; pagination: { total: number } } }>(
      `/api/admin/generation-records?page=${page.value}&limit=${limit.value}`,
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

async function handleBatchDelete(): Promise<void> {
  try {
    await api.post('/api/admin/generation-records/batch-delete', { ids: checkedRowKeys.value });
    message.success(`已删除 ${checkedRowKeys.value.length} 条记录`);
    checkedRowKeys.value = [];
    load();
  } catch (e: unknown) {
    const err = e as { message?: string };
    message.error(err?.message || '批量删除失败');
  }
}

async function handleClearAll(): Promise<void> {
  try {
    await api.post('/api/admin/generation-records/clear');
    message.success('已清空全部生成记录');
    checkedRowKeys.value = [];
    load();
  } catch (e: unknown) {
    const err = e as { message?: string };
    message.error(err?.message || '清空失败');
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
    <NSpace v-if="isSuperAdmin" style="margin-bottom: 12px">
      <NPopconfirm v-if="checkedRowKeys.length > 0" @positive-click="handleBatchDelete">
        <template #trigger>
          <NButton size="small" type="error">删除选中 ({{ checkedRowKeys.length }})</NButton>
        </template>
        确定删除选中的 {{ checkedRowKeys.length }} 条生成记录？
      </NPopconfirm>
      <NPopconfirm @positive-click="handleClearAll">
        <template #trigger>
          <NButton size="small" type="warning">清空全部记录</NButton>
        </template>
        确定清空全部生成记录？此操作不可恢复。
      </NPopconfirm>
    </NSpace>
    <NDataTable
      :columns="displayColumns"
      :data="items"
      :loading="loading"
      :bordered="false"
      :row-key="(row: GenRecord) => row.id"
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
