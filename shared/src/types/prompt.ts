/**
 * @contentflow/shared/types/prompt — Prompt 模板/版本/输出校验
 */

import type { PromptTemplate } from './common.js';

// ══════════════════════════════════════════════════════════════
// FinalPrompt — AI 调用的标准化 prompt 结构
// ══════════════════════════════════════════════════════════════

/** AI 调用使用的最终 Prompt（system + user） */
export interface FinalPrompt {
  /** 系统 Prompt（设定 AI 角色/规则/输出格式） */
  systemPrompt: string;
  /** 用户 Prompt（具体内容请求） */
  userPrompt: string;
}

// ══════════════════════════════════════════════════════════════
// OutputSchema — 校验 AI 输出结构
// ══════════════════════════════════════════════════════════════

export interface OutputSchema {
  /** 必填字段列表 */
  required: string[];
  /** 字段定义 */
  properties: Record<string, FieldSchema>;
  /** 最小项数（数组字段） */
  minItems?: Record<string, number>;
  /** 最大项数（数组字段） */
  maxItems?: Record<string, number>;
}

export interface FieldSchema {
  /** 字段类型 */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  /** 是否必填 */
  required?: boolean;
  /** 数组元素类型 */
  items?: FieldSchema;
  /** 对象属性定义 */
  properties?: Record<string, FieldSchema>;
}

// ══════════════════════════════════════════════════════════════
// DB 行类型
// ══════════════════════════════════════════════════════════════

/** prompt_templates 表行（snake_case） */
export interface PromptTemplateRow {
  id: string;
  user_id: string;
  name: string;
  type: 'text' | 'image';
  /** 0 = false, 1 = true */
  is_default: number;
  platform: string;
  system_prompt: string;
  user_prompt: string;
  created_at: string;
  updated_at: string;
}

// ══════════════════════════════════════════════════════════════
// 前端 UI 展示类型
// ══════════════════════════════════════════════════════════════

/** 前端 Prompt 版本快照（UI 展示） */
export interface PromptVersion {
  id: string;
  promptId: string;
  version: string;
  /** 版本创建时的 PromptTemplate 快照 */
  content: PromptTemplate;
  createdAt: string;
}
