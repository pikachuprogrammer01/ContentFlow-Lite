/**
 * @contentflow/shared/types/common — 通用类型（平台、导出、前端 UI）
 */

import type { Content } from './content.js';

// ══════════════════════════════════════════════════════════════
// Platform
// ══════════════════════════════════════════════════════════════

/** 支持的平台标识 */
export type Platform =
  | 'xiaohongshu'
  | 'wechat'
  | 'zhihu'
  | 'douyin'
  | 'bilibili'
  | 'toutiao';

// ══════════════════════════════════════════════════════════════
// Error
// ══════════════════════════════════════════════════════════════

/** 错误类型（前端分类） */
export type ErrorType =
  | 'INPUT_ERROR'
  | 'PROMPT_ERROR'
  | 'PROVIDER_ERROR'
  | 'PARSE_ERROR'
  | 'DTO_ERROR'
  | 'EXPORT_ERROR'
  | 'UNKNOWN_ERROR';

export interface AppError {
  code: string;
  module: string;
  message: string;
  detail?: unknown;
}

// ══════════════════════════════════════════════════════════════
// Exporter
// ══════════════════════════════════════════════════════════════

/** 导出格式 */
export type ExportFormat = 'markdown' | 'json' | 'html';

export interface Exporter {
  readonly format: ExportFormat;
  export(content: Content): string;
}

// ══════════════════════════════════════════════════════════════
// 前端 UI 类型
// ══════════════════════════════════════════════════════════════

/** 前端 Prompt 模板（UI 展示） */
export interface PromptTemplate {
  id: string;
  name: string;
  platform: string;
  systemPrompt: string;
  userPrompt: string;
}

/** 前端生成记录（UI 展示） */
export interface GenerationRecord {
  id: string;
  topic: string;
  platform: string;
  promptId: string;
  promptVersion: string;
  model: string;
  contentId: string;
  createdAt: string;
}

// ══════════════════════════════════════════════════════════════
// Repository & DB
// ══════════════════════════════════════════════════════════════

/** 数据仓库接口 */
export interface Repository<T extends { id: string }> {
  getById(id: string): Promise<T | null>;
  list(filter?: Record<string, unknown>): Promise<T[]>;
  create(item: Omit<T, 'id'>): Promise<T>;
  update(id: string, item: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

/** generation_records 表行（snake_case） */
export interface GenerationRow {
  id: string;
  user_id: string;
  content_id: string;
  topic: string;
  platform: string;
  prompt_id: string;
  prompt_version: string;
  model: string;
  created_at: string;
}
