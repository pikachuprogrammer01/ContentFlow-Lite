/**
 * @contentflow/shared/types/index — 类型汇总入口
 *
 * 按模块拆分，本文件做统一重导出。
 */

// Content DTO
export type {
  Title,
  Cover,
  Page,
  Metadata,
  Content,
  ContentRow,
} from './content.js';

// Prompt
export type {
  FinalPrompt,
  OutputSchema,
  FieldSchema,
  PromptTemplateRow,
  PromptVersion,
} from './prompt.js';

// Workflow
export type {
  WorkflowNodeType,
  WorkflowInput,
  WorkflowContext,
  WorkflowError,
  WorkflowErrorCode,
} from './workflow.js';

// Provider
export type {
  AIProvider,
  ImageProvider,
  ImageResult,
  GenerateRequest,
} from './provider.js';

// Auth
export type {
  TokenPayload,
  UserInfo,
  LoginRequest,
  RegisterRequest,
  UserRow,
} from './auth.js';

// Common
export type {
  Platform,
  ErrorType,
  AppError,
  ExportFormat,
  Exporter,
  PromptTemplate,
  GenerationRecord,
  Repository,
  GenerationRow,
} from './common.js';
