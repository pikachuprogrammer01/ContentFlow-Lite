/**
 * @contentflow/shared/types/content — Content DTO 及其 DB 行类型
 */

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
// DB 行类型
// ══════════════════════════════════════════════════════════════

/** contents 表行（snake_case） */
export interface ContentRow {
  id: string;
  user_id: string;
  topic: string;
  platform: string;
  /** JSON: Title[] */
  titles: string;
  /** JSON: Cover */
  cover: string;
  /** JSON: Page[] */
  pages: string;
  /** JSON: string[] */
  tags: string;
  summary?: string;
  extra_requirements?: string;
  /** JSON: Metadata */
  metadata: string;
  created_at: string;
  updated_at: string;
}
