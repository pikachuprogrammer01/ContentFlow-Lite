/**
 * @contentflow/shared — 共享类型定义
 *
 * 客户端与服务端唯一类型源。所有模块的类型引用指向本包。
 * 服务端独有的 snake_case Row 类型保留在 server/types.ts。
 */

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
// Content DTO — 系统唯一内容数据结构
// ══════════════════════════════════════════════════════════════

/** 标题对象 */
export interface Title {
  /** 唯一标识 */
  id: string;
  /** 标题文本 */
  text: string;
  /** 标题类型 */
  type: 'main' | 'sub' | 'catchy';
}

/** 封面 */
export interface Cover {
  /** 封面主标题 */
  title: string;
  /** 封面副标题 */
  subtitle?: string;
  /** 封面图片生成 Prompt */
  imagePrompt?: string;
  /** 生成后的封面图片地址 */
  imageUrl?: string;
  /** 封面图片生成状态 */
  imageStatus?: 'pending' | 'generating' | 'done' | 'failed';
}

/** 内容单页 */
export interface Page {
  /** 唯一标识 */
  id: string;
  /** 页码顺序 */
  order: number;
  /** 页正文 */
  text: string;
  /** 该页图片生成 Prompt */
  imagePrompt?: string;
  /** 生成后的图片地址 */
  imageUrl?: string;
  /** 图片生成状态 */
  imageStatus?: 'pending' | 'generating' | 'done' | 'failed';
}

/** Content DTO 元数据 */
export interface Metadata {
  /** 使用的 Prompt 模板 ID */
  promptId: string;
  /** 使用的 Prompt 版本号 */
  promptVersion: string;
  /** AI 模型标识 */
  model: string;
  /** 目标平台 */
  platform: string;
  /** 创建时间 (ISO 8601) */
  createdAt: string;
}

/** Content DTO — 系统唯一内容数据结构 */
export interface Content {
  /** 唯一标识 */
  id: string;
  /** 内容主题 */
  topic: string;
  /** 目标平台 */
  platform: string;
  /** 标题列表（含主标题/副标题/爆款标题） */
  titles: Title[];
  /** 封面信息 */
  cover: Cover;
  /** 分页内容 */
  pages: Page[];
  /** 标签 */
  tags: string[];
  /** 内容摘要 */
  summary?: string;
  /** 用户输入的补充要求 */
  extraRequirements?: string;
  /** 生成元数据 */
  metadata: Metadata;
}

// ══════════════════════════════════════════════════════════════
// FinalPrompt — AI 调用的标准化 prompt 结构
// ══════════════════════════════════════════════════════════════

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
// Workflow Error
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
  /** 发生错误的 Workflow 节点 */
  node: string;
  /** 时间戳 (ISO 8601) */
  timestamp: string;
  detail?: unknown;
}

// ══════════════════════════════════════════════════════════════
// Workflow Context
// ══════════════════════════════════════════════════════════════

export type WorkflowNodeType =
  | 'input'
  | 'prompt'
  | 'provider'
  | 'parse'
  | 'validate'
  | 'dto'
  | 'output';

export interface WorkflowInput {
  topic: string;
  platform: string;
  provider: string;
  extraRequirements?: string;
  promptId?: string;
  userId: string;
}

export interface WorkflowContext {
  traceId: string;
  input: WorkflowInput;
  finalPrompt?: FinalPrompt;
  rawResponse?: string;
  parsedContent?: Content;
  output?: Content;
  error?: WorkflowError;
  currentNode: WorkflowNodeType;
}

// ══════════════════════════════════════════════════════════════
// Provider 接口
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
// Auth / User
// ══════════════════════════════════════════════════════════════

/** JWT Token 载荷 */
export interface TokenPayload {
  userId: string;
  role: 'super_admin' | 'admin' | 'user';
}

/** 前端使用的用户信息（camelCase） */
export interface UserInfo {
  id: string;
  username: string;
  email: string;
  role: 'super_admin' | 'admin' | 'user';
  createdAt?: string;
}

/** 登录请求 */
export interface LoginRequest {
  username: string;
  password: string;
}

/** 注册请求 */
export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
  confirmPassword: string;
}

/** 后端用户行（snake_case，DB 原始结构） */
export interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: 'super_admin' | 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

/** 生成请求 */
export interface GenerateRequest {
  topic: string;
  platform: string;
  provider: string;
  extraRequirements?: string;
  promptId?: string;
}

// ══════════════════════════════════════════════════════════════
// Content Row (DB)
// ══════════════════════════════════════════════════════════════

export interface ContentRow {
  id: string;
  user_id: string;
  topic: string;
  platform: string;
  titles: string;       // JSON
  cover: string;         // JSON
  pages: string;         // JSON
  tags: string;          // JSON
  summary?: string;
  extra_requirements?: string;
  metadata: string;      // JSON
  created_at: string;
  updated_at: string;
}

// ══════════════════════════════════════════════════════════════
// Prompt Row (DB)
// ══════════════════════════════════════════════════════════════

export interface PromptTemplateRow {
  id: string;
  user_id: string;
  name: string;
  type: 'text' | 'image';
  is_default: number;    // 0 | 1
  platform: string;
  system_prompt: string;
  user_prompt: string;
  created_at: string;
  updated_at: string;
}

// ══════════════════════════════════════════════════════════════
// Generation Row (DB)
// ══════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════
// 客户端独有类型（前端 UI/Workflow/Exporter）
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

/** 导出格式 */
export type ExportFormat = 'markdown' | 'json' | 'html';

export interface Exporter {
  readonly format: ExportFormat;
  export(content: Content): string;
}

/** 前端 Prompt 模板（UI 展示） */
export interface PromptTemplate {
  id: string;
  name: string;
  platform: string;
  systemPrompt: string;
  userPrompt: string;
}

/** 前端 Prompt 版本（UI 展示） */
export interface PromptVersion {
  id: string;
  promptId: string;
  version: string;
  content: PromptTemplate;
  createdAt: string;
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

/** 数据仓库接口 */
export interface Repository<T extends { id: string }> {
  getById(id: string): Promise<T | null>;
  list(filter?: Record<string, unknown>): Promise<T[]>;
  create(item: Omit<T, 'id'>): Promise<T>;
  update(id: string, item: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}
