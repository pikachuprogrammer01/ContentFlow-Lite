<script setup lang="ts">
/**
 * PromptVersionTab — Prompt 版本管理标签页（只读快照）
 */

import { ref, onMounted } from 'vue';
import { NDataTable, useMessage } from 'naive-ui';
import type { DataTableColumn } from 'naive-ui';
import { api } from '@/utils/api-client';
import { platformLabel } from '@/utils/platform';

const message = useMessage();

interface PromptVersion {
  id: string;
  promptId: string;
  version: string;
  templateName: string;
  platform: string;
  createdAt: string;
}

const items = ref<PromptVersion[]>([]);
const loading = ref(false);
const page = ref(1);
const total = ref(0);
const limit = 20;

const columns: DataTableColumn<PromptVersion>[] = [
  { title: 'ID', key: 'id', width: 120, ellipsis: { tooltip: true } },
  { title: '模板ID', key: 'promptId', width: 120, ellipsis: { tooltip: true } },
  { title: '版本', key: 'version', width: 60 },
  { title: '模板名称', key: 'templateName', ellipsis: { tooltip: true } },
  { title: '平台', key: 'platform', width: 80, render: (row) => platformLabel(row.platform) },
  {
    title: '创建时间', key: 'createdAt', width: 160,
    render: (row) => new Date(row.createdAt).toLocaleString(),
  },
];

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await api.get<{ data: { items: PromptVersion[]; pagination: { total: number } } }>(
      `/api/admin/prompt-versions?page=${page.value}&limit=${limit}`,
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

function onPageChange(p: number): void {
  page.value = p;
  load();
}

onMounted(load);
</script>

<template>
  <NDataTable
    :columns="columns"
    :data="items"
    :loading="loading"
    :bordered="false"
    :pagination="{
      page: page, pageSize: limit, itemCount: total,
      onChange: onPageChange,
    }"
  />
</template>
