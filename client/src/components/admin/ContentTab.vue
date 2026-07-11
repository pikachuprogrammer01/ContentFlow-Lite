<script setup lang="ts">
/**
 * ContentTab — 内容管理标签页
 *
 * - 管理员/超级管理员：查看所有用户内容、删除、查看详情
 * - 超级管理员：支持批量选择和批量删除
 * - 详情弹窗：NSkeleton 骨架加载 → 完整内容预览 + 复制全文 / 导出（txt / md / json）
 */

import { ref, onMounted, h, computed } from 'vue';
import {
  NDataTable, NButton, NPopconfirm, NSpace, NModal,
  NTag, NDivider, NTooltip, NSkeleton, useMessage,
} from 'naive-ui';
import type { DataTableColumn, DataTableRowKey } from 'naive-ui';
import { api } from '@/utils/api-client';
import { platformLabel } from '@/utils/platform';
import { useAuthStore } from '@/stores/auth';
import type { Content } from '@contentflow/shared/types/content';

const message = useMessage();
const auth = useAuthStore();
const isSuperAdmin = computed(() => auth.user?.role === 'super_admin');

// ── 列表项（轻量）─────────────────────────────────────

interface ContentItem {
  id: string;
  userId: string;
  username: string;
  topic: string;
  platform: string;
  summary: string;
  tags: string[];
  titleCount: number;
  pageCount: number;
  createdAt: string;
}

/** 详情弹窗数据：完整 Content DTO（与 shared/types/content.ts 对齐） */
type ContentDetail = Pick<Content, 'topic' | 'platform' | 'summary' | 'tags' | 'titles' | 'cover' | 'pages' | 'extraRequirements' | 'metadata'>;

const items = ref<ContentItem[]>([]);
const loading = ref(false);
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const checkedRowKeys = ref<DataTableRowKey[]>([]);

// ── 详情弹窗 ──────────────────────────────────────────

const showDetail = ref(false);
const detail = ref<ContentDetail | null>(null);
const detailError = ref(false);

async function openDetail(row: ContentItem): Promise<void> {
  detail.value = null;
  detailError.value = false;
  showDetail.value = true;
  try {
    detail.value = await api.get<ContentDetail>(`/api/admin/contents/${row.id}`);
  } catch {
    detailError.value = true;
  }
}

// ── 复制 / 导出 ──────────────────────────────────────

function buildTxt(d: ContentDetail): string {
  const lines: string[] = [];
  lines.push(d.topic);
  lines.push('='.repeat(d.topic.length));
  lines.push('');
  if (d.cover) {
    lines.push(`【封面】${d.cover.title}`);
    if (d.cover.subtitle) lines.push(`        ${d.cover.subtitle}`);
    lines.push('');
  }
  if (d.titles.length > 0) {
    lines.push('── 标题候选 ──');
    d.titles.forEach((t, i) => lines.push(`  ${i + 1}. ${t.text}  [${t.type}]`));
    lines.push('');
  }
  d.pages.forEach((p, i) => {
    lines.push(`── 第 ${i + 1} 页 ──`);
    lines.push(p.text);
    lines.push('');
  });
  if (d.tags.length > 0) lines.push(`标签：${d.tags.join('、')}`);
  if (d.summary) lines.push(`\n摘要：${d.summary}`);
  return lines.join('\n');
}

function buildMd(d: ContentDetail): string {
  const lines: string[] = [];
  lines.push(`# ${d.topic}\n`);
  if (d.summary) lines.push(`> ${d.summary}\n`);
  if (d.cover) {
    lines.push(`**封面**：${d.cover.title}`);
    if (d.cover.subtitle) lines.push(`*${d.cover.subtitle}*\n`);
  }
  if (d.titles.length > 0) {
    lines.push('## 标题候选\n');
    d.titles.forEach((t, i) => lines.push(`${i + 1}. **${t.text}**（${t.type}）`));
    lines.push('');
  }
  d.pages.forEach((p, i) => {
    lines.push(`## 第 ${i + 1} 页\n`);
    lines.push(p.text);
    lines.push('');
  });
  if (d.tags.length > 0) lines.push(`标签：${d.tags.map((t) => `\`${t}\``).join(' ')}`);
  return lines.join('\n');
}

function buildJson(d: ContentDetail): string {
  return JSON.stringify(d, null, 2);
}

function doExport(d: ContentDetail, format: 'txt' | 'md' | 'json'): void {
  const content = format === 'txt' ? buildTxt(d) : format === 'md' ? buildMd(d) : buildJson(d);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${d.topic || 'content'}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
  message.success(`已导出 ${format.toUpperCase()}`);
}

async function doCopy(d: ContentDetail): Promise<void> {
  try {
    await navigator.clipboard.writeText(buildTxt(d));
    message.success('已复制全文到剪贴板');
  } catch {
    message.error('复制失败，请手动选择文本');
  }
}

// ── 列定义 ────────────────────────────────────────────

const typeCol: DataTableColumn<ContentItem> = { type: 'selection' };

const columns = computed<DataTableColumn<ContentItem>[]>(() => [
  { title: 'ID', key: 'id', width: 100, ellipsis: { tooltip: true } },
  { title: '用户', key: 'username', width: 90, ellipsis: { tooltip: true } },
  { title: '主题', key: 'topic', width: 180, ellipsis: { tooltip: true } },
  {
    title: '平台', key: 'platform', width: 90,
    render: (row) => h(NTag, { size: 'small', type: 'info' }, () => platformLabel(row.platform)),
  },
  {
    title: '标签', key: 'tags', width: 110,
    render: (row) => {
      const tags = row.tags || [];
      if (tags.length === 0) return '—';
      const show = tags.slice(0, 2);
      const rest = tags.slice(2);
      return h('span', { style: 'display: flex; align-items: center; gap: 2px' }, [
        ...show.map((t) => h(NTag, { size: 'tiny', bordered: false }, () => t)),
        rest.length > 0
          ? h(
              NTooltip,
              {},
              {
                trigger: () => h(NTag, { size: 'tiny', bordered: false, type: 'default' }, () => `+${rest.length}`),
                default: () => rest.map((t, i) => h('div', { key: i }, t)),
              },
            )
          : null,
      ]);
    },
  },
  { title: '标题', key: 'titleCount', width: 60, align: 'center' },
  { title: '页数', key: 'pageCount', width: 60, align: 'center' },
  {
    title: '创建时间', key: 'createdAt', width: 170,
    render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString() : '—',
  },
  {
    title: '操作', key: 'actions', width: 140,
    render: (row) => h('div', { style: 'display: flex; gap: 6px' }, [
      h(NButton, { size: 'tiny', onClick: () => openDetail(row) }, { default: () => '详情' }),
      h(NPopconfirm, { onPositiveClick: () => handleDelete(row.id) }, {
        trigger: () => h(NButton, { size: 'tiny', type: 'error' }, { default: () => '删除' }),
        default: () => '确定删除该内容？',
      }),
    ]),
  },
]);

// ── API 调用 ──────────────────────────────────────────

async function load(): Promise<void> {
  loading.value = true;
  try {
    const body = await api.get<{ items: ContentItem[]; pagination: { total: number } }>(
      `/api/admin/contents?page=${page.value}&limit=${limit.value}`,
    );
    items.value = body.items || [];
    total.value = body.pagination?.total || 0;
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
    await load();
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
    await load();
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
    <!-- 批量操作栏 -->
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
      :columns="isSuperAdmin ? [typeCol, ...columns] : columns"
      :data="items"
      :loading="loading"
      :bordered="false"
      :row-key="(row: ContentItem) => row.id"
      :checked-row-keys="checkedRowKeys"
      @update:checked-row-keys="handleCheck"
      :pagination="{
        page, pageSize: limit, itemCount: total,
        showSizePicker: true,
        pageSizes: [10, 20, 50, 100],
        onChange: onPageChange,
      }"
      @update:page-size="onPageSizeChange"
    />

    <!-- 详情弹窗（骨架屏 → 内容 / 错误） -->
    <NModal v-model:show="showDetail" title="内容详情" preset="card" style="width: 820px; max-width: 95vw">
      <template #header-extra>
        <span v-if="detail" style="font-size: 13px; color: #888">{{ detail.topic }}</span>
      </template>

      <!-- ▼ 骨架屏 -->
      <div v-if="!detail && !detailError" style="max-height: 65vh; overflow: hidden">
        <div style="display: flex; gap: 8px; margin-bottom: 16px">
          <NSkeleton width="60px" height="24px" :repeat="3" style="display: inline-flex; gap: 8px" />
        </div>
        <NSkeleton width="70%" height="18px" style="margin-bottom: 20px" />
        <NDivider />
        <NSkeleton width="120px" height="18px" style="margin-bottom: 12px" />
        <NSkeleton width="100%" height="48px" style="margin-bottom: 8px" />
        <NSkeleton width="80%" height="18px" style="margin-bottom: 20px" />
        <NDivider />
        <NSkeleton width="100px" height="18px" style="margin-bottom: 12px" />
        <div v-for="i in 3" :key="i" style="margin-bottom: 14px">
          <NSkeleton width="60px" height="16px" style="margin-bottom: 6px" />
          <NSkeleton width="100%" height="60px" />
        </div>
        <NDivider />
        <div v-for="i in 2" :key="'p' + i" style="margin-bottom: 16px">
          <NSkeleton width="80px" height="20px" style="margin-bottom: 8px" />
          <NSkeleton width="100%" height="16px" :repeat="5" style="margin-bottom: 4px" />
        </div>
      </div>

      <!-- ▼ 加载失败 -->
      <div v-else-if="detailError" style="text-align: center; padding: 48px 0; color: #999">
        <p style="font-size: 16px; margin-bottom: 12px">😞 加载失败</p>
        <NButton size="small" @click="showDetail = false">关闭</NButton>
      </div>

      <!-- ▼ 内容（数据已加载） -->
      <div v-else style="max-height: 65vh; overflow-y: auto">
        <!-- 标签行 -->
        <div style="display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap">
          <NTag type="info" size="small">{{ platformLabel(detail.platform) }}</NTag>
          <NTag v-for="t in detail.tags" :key="t" size="small" :bordered="false">{{ t }}</NTag>
        </div>

        <!-- 摘要 -->
        <p v-if="detail.summary" style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 18px">
          {{ detail.summary }}
        </p>

        <!-- 封面 -->
        <div style="margin-bottom: 18px">
          <div style="font-size: 13px; color: #999; margin-bottom: 8px; font-weight: 600">📷 封面</div>
          <div style="background: #f0f4ff; padding: 14px 16px; border-radius: 8px">
            <p style="font-weight: 600; font-size: 15px; margin: 0 0 4px">{{ detail.cover.title }}</p>
            <p v-if="detail.cover.subtitle" style="color: #888; font-size: 13px; margin: 0">{{ detail.cover.subtitle }}</p>
            <p v-if="detail.cover.imagePrompt" style="color: #aaa; font-size: 12px; margin: 8px 0 0">
              图片 Prompt：{{ detail.cover.imagePrompt }}
            </p>
          </div>
        </div>

        <NDivider />

        <!-- 标题候选 -->
        <div style="margin-bottom: 18px">
          <div style="font-size: 13px; color: #999; margin-bottom: 8px; font-weight: 600">
            ✏️ 标题候选（{{ detail.titles.length }}）
          </div>
          <div v-if="detail.titles.length > 0">
            <div
              v-for="t in detail.titles"
              :key="t.id"
              style="padding: 8px 12px; background: #f8f9fa; border-radius: 6px; margin-bottom: 6px; font-size: 14px"
            >
              <strong style="color: #3b82f6">{{ t.type }}</strong>
              <span style="margin-left: 8px">{{ t.text }}</span>
            </div>
          </div>
          <p v-else style="color: #999; font-size: 13px">无标题数据</p>
        </div>

        <NDivider />

        <!-- 正文 -->
        <div style="margin-bottom: 18px">
          <div style="font-size: 13px; color: #999; margin-bottom: 10px; font-weight: 600">
            📄 正文（{{ detail.pages.length }} 页）
          </div>
          <div v-if="detail.pages.length > 0">
            <div
              v-for="(p, i) in detail.pages"
              :key="p.id"
              style="margin-bottom: 16px; background: #fff; border: 1px solid #eee; border-radius: 8px; overflow: hidden"
            >
              <div style="background: #f5f7fa; padding: 6px 14px; font-size: 13px; color: #888">
                第 {{ i + 1 }} 页
                <span v-if="p.imageStatus" style="margin-left: 8px; font-size: 11px">
                  {{ p.imageStatus === 'done' ? '🖼️ 已生成' : p.imageStatus === 'generating' ? '⏳' : '' }}
                </span>
              </div>
              <div style="padding: 14px 16px; font-size: 15px; line-height: 1.85; color: #333; white-space: pre-wrap">
                {{ p.text }}
              </div>
            </div>
          </div>
          <p v-else style="color: #999; font-size: 13px">无正文内容</p>
        </div>

        <!-- 额外要求 -->
        <div v-if="detail.extraRequirements" style="margin-top: 18px">
          <NDivider />
          <div style="font-size: 13px; color: #999; margin-bottom: 8px; font-weight: 600">📌 额外要求</div>
          <p style="white-space: pre-wrap; color: #666; font-size: 13px; line-height: 1.6">
            {{ detail.extraRequirements }}
          </p>
        </div>
      </div>

      <!-- Footer 操作 -->
      <template #footer>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <NButton size="small" :disabled="!detail" @click="detail && doCopy(detail)">
            📋 复制全文
          </NButton>
          <NSpace>
            <NButton size="small" :disabled="!detail" @click="detail && doExport(detail, 'txt')">TXT</NButton>
            <NButton size="small" :disabled="!detail" @click="detail && doExport(detail, 'md')">MD</NButton>
            <NButton size="small" :disabled="!detail" @click="detail && doExport(detail, 'json')">JSON</NButton>
          </NSpace>
        </div>
      </template>
    </NModal>
  </div>
</template>
