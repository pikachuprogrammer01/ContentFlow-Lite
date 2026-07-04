/**
 * server/types.ts — 系统核心类型定义
 *
 * 本文件是 ContentFlow Lite 的唯一类型源。
 * 所有模块的类型引用必须指向本文件。
 */

// ══════════════════════════════════════════════════════════════
// Content DTO — 唯一内容数据结构
// ══════════════════════════════════════════════════════════════

/** Content DTO 的元数据 */
export interface Metadata {
  promptId: string;
  promptVersion: string;
  model: string;
  platform: string;
  createdAt: string;
  [key: string]: unknown;
}

/** 标题对象 */
export interface Title {
  id: string;
  text: string;
  type: 'main' | 'sub' | 'catchy';
}

/** 封面 */
export interface Cover {
  title: string;
  subtitle?: string;
  imagePrompt?: string;
  imageUrl?: string;
  imageStatus?: 'pending' | 'generating' | 'done' | 'failed';
}

/** 单页内容 */
export interface Page {
  id: string;
  order: number;
  text: string;
  imagePrompt?: string;
  imageUrl?: string;
  imageStatus?: 'pending' | 'generating' | 'done' | 'failed';
}

/** Content DTO — 系统唯一内容数据结构 */
export interface Content {
  id: string;
  topic: string;
  platform: string;
  titles: Title[];
  cover: Cover;
  pages: Page[];
  tags: string[];
  summary?: string;
  extraRequirements?: string;
  metadata: Metadata;
}

// ══════════════════════════════════════════════════════════════
// FinalPrompt — AI 调用的标准化 prompt 结构
// ══════════════════════════════════════════════════════════════

export interface FinalPrompt {
  systemPrompt: string;
  userPrompt: string;
}

// ══════════════════════════════════════════════════════════════
// OutputSchema — 用于校验 AI 输出结构
// ══════════════════════════════════════════════════════════════

export interface OutputSchema {
  required: string[];
  properties: Record<string, FieldSchema>;
  minItems?: Record<string, number>;
  maxItems?: Record<string, number>;
}

export interface FieldSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  items?: FieldSchema;
  properties?: Record<string, FieldSchema>;
}

// ══════════════════════════════════════════════════════════════
// WorkflowError — 统一错误结构
// ══════════════════════════════════════════════════════════════

export type WorkflowErrorCode =
  | 'INPUT_ERROR'
  | 'PROMPT_ERROR'
  | 'PROVIDER_ERROR'
  | 'PARSE_ERROR'
  | 'VALIDATE_ERROR'
  | 'DTO_ERROR'
  | 'UNKNOWN_ERROR';

export interface WorkflowError {
  code: WorkflowErrorCode;
  message: string;
  node: string;
  timestamp: string;
  detail?: unknown;
}

// ══════════════════════════════════════════════════════════════
// WorkflowContext — Workflow 执行上下文
// ══════════════════════════════════════════════════════════════

export interface WorkflowInput {
  topic: string;
  platform: string;
  provider: string;
  extraRequirements?: string;
  promptId?: string;
  /** 用户 ID（来自 JWT） */
  userId: string;
}

export interface WorkflowContext {
  /** 执行唯一标识 */
  traceId: string;
  /** 用户输入 */
  input: WorkflowInput;
  /** 构建好的 Final Prompt */
  finalPrompt?: FinalPrompt;
  /** AI 原始输出文本 */
  rawResponse?: string;
  /** 解析后的 Content（Parse Node 产出） */
  parsedContent?: Content;
  /** 最终的 Content DTO（DTO Node 产出） */
  output?: Content;
  /** 错误信息 */
  error?: WorkflowError;
  /** 当前阶段 */
  currentNode: WorkflowNodeType;
}

export type WorkflowNodeType =
  | 'input'
  | 'prompt'
  | 'provider'
  | 'parse'
  | 'validate'
  | 'dto'
  | 'output';

// ══════════════════════════════════════════════════════════════
// AIProvider / ImageProvider — Provider 接口
// ══════════════════════════════════════════════════════════════

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  generate(prompt: FinalPrompt): Promise<string>;
}

export interface ImageResult {
  url: string;
  width?: number;
  height?: number;
}

export interface ImageProvider {
  readonly name: string;
  readonly model: string;
  generate(prompt: string): Promise<ImageResult>;
}

// ══════════════════════════════════════════════════════════════
// API 请求/响应类型
// ══════════════════════════════════════════════════════════════

export interface GenerateRequest {
  topic: string;
  platform: string;
  provider: string;
  extraRequirements?: string;
  promptId?: string;
}

export interface AuthRequest {
  username: string;
  password: string;
  email?: string;
}

export interface TokenPayload {
  userId: string;
  role: 'admin' | 'user';
}

// ══════════════════════════════════════════════════════════════
// DB 行类型
// ══════════════════════════════════════════════════════════════

export interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

export interface ContentRow {
  id: string;
  user_id: string;
  topic: string;
  platform: string;
  titles: string;
  cover: string;
  pages: string;
  tags: string;
  summary?: string;
  extra_requirements?: string;
  metadata: string;
  created_at: string;
  updated_at: string;
}

export interface PromptTemplateRow {
  id: string;
  user_id: string;
  name: string;
  type: 'text' | 'image';
  is_default: number;
  platform: string;
  system_prompt: string;
  user_prompt: string;
  created_at: string;
  updated_at: string;
}

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
