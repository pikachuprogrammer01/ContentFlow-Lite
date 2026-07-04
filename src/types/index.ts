/**
 * ContentFlow Lite - 核心类型定义
 *
 * Content DTO 是整个系统唯一的数据模型。
 * 所有模块（Workflow / Parser / Editor / Exporter / Storage）均围绕此 DTO 工作。
 *
 * 与 docs/types.md 保持对齐。
 */

// ============================================================
// Content DTO
// ============================================================

export interface Title {
  id: string;
  text: string;
}

export interface Cover {
  title: string;
  subtitle: string;
}

export interface Page {
  id: string;
  title: string;
  content: string;
  /** 该页对应的图片生成 Prompt（用户可选填） */
  imagePrompt?: string;
  /** 生成后的图片地址 */
  imageUrl?: string;
  /** 图片生成状态 */
  imageStatus?: 'idle' | 'generating' | 'done' | 'failed';
}

export interface Metadata {
  promptId: string;
  promptVersion: string;
  model: string;
  platform: string;
  createdAt: string;
  generator: string;
}

export interface Content {
  id: string;
  topic: string;
  platform: string;
  titles: Title[];
  cover: Cover;
  pages: Page[];
  tags: string[];
  summary: string;
  /** 用户输入的补充要求，重试时复用 */
  extraRequirements?: string;
  metadata: Metadata;
}

// ============================================================
// Prompt 相关
// ============================================================

export interface PromptTemplate {
  id: string;
  name: string;
  platform: string;
  systemPrompt: string;
  userPrompt: string;
}

export interface PromptVersion {
  id: string;
  promptId: string;
  version: string;
  content: PromptTemplate;
  createdAt: string;
}

export interface PromptBuildInput {
  template: PromptTemplate;
  variables: PromptVariables;
  version: PromptVersion;
}

export interface PromptVariables {
  topic: string;
  platform: string;
  audience?: string;
  tone?: string;
  extraRequirements?: string;
}

export interface FinalPrompt {
  systemPrompt: string;
  userPrompt: string;
  version: PromptVersion;
}

// ============================================================
// Workflow 相关
// ============================================================

export type WorkflowNodeType =
  | 'input'
  | 'prompt'
  | 'provider'
  | 'parse'
  | 'dto'
  | 'output';

export interface WorkflowContext {
  workflowId: string;
  input: WorkflowInput;
  finalPrompt?: FinalPrompt;
  rawResponse?: string;
  content?: Content;
  startedAt: string;
  nodeTimings: Record<WorkflowNodeType, number>;
}

export interface WorkflowInput {
  topic: string;
  platform: string;
  promptId: string;
  promptVersion: string;
  extraRequirements?: string;
}

export interface WorkflowResult {
  success: boolean;
  content?: Content;
  error?: WorkflowError;
  workflowId: string;
}

// ============================================================
// 错误处理
// ============================================================

export type ErrorType =
  | 'INPUT_ERROR'
  | 'PROMPT_ERROR'
  | 'PROVIDER_ERROR'
  | 'PARSE_ERROR'
  | 'DTO_ERROR'
  | 'STORAGE_ERROR'
  | 'EXPORT_ERROR'
  | 'UNKNOWN_ERROR';

export interface AppError {
  code: string;
  module: string;
  message: string;
  detail?: unknown;
}

export interface WorkflowError {
  code: string;
  message: string;
  node: WorkflowNodeType;
  timestamp: string;
  detail?: unknown;
}

// ============================================================
// Provider 接口
// ============================================================

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  generate(prompt: FinalPrompt): Promise<string>;
}

// ============================================================
// Repository 接口
// ============================================================

export interface Repository<T extends { id: string }> {
  getById(id: string): Promise<T | null>;
  list(filter?: Record<string, unknown>): Promise<T[]>;
  create(item: Omit<T, 'id'>): Promise<T>;
  update(id: string, item: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

// ============================================================
// Exporter 接口
// ============================================================

export type ExportFormat = 'markdown' | 'json' | 'html';

export interface Exporter {
  readonly format: ExportFormat;
  export(content: Content): string;
}

// ============================================================
// Generation Record
// ============================================================

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

// ============================================================
// 平台 & 模型类型
// ============================================================

export type Platform =
  | 'xiaohongshu'
  | 'wechat'
  | 'zhihu'
  | 'douyin'
  | 'bilibili'
  | 'toutiao';

export type TextModel = 'gemini-2.0-flash' | 'deepseek-v4-flash' | 'qwen2.5-72b-instruct';

// ============================================================
// 认证相关
// ============================================================

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  createdAt?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
  confirmPassword: string;
}
