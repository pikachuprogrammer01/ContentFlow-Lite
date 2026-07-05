/**
 * client/src/types/index.ts — 客户端类型入口
 *
 * 所有共享类型定义在 @contentflow/shared。
 * 本文件只做重导出，禁止在此新增与 shared 重复的类型。
 */

export type {
  // Content DTO
  Title,
  Cover,
  Page,
  Metadata,
  Content,
  // Prompt / AI
  FinalPrompt,
  OutputSchema,
  FieldSchema,
  PromptTemplate,
  PromptVersion,
  // Workflow
  WorkflowNodeType,
  WorkflowInput,
  WorkflowContext,
  WorkflowError,
  WorkflowErrorCode,
  // Provider
  AIProvider,
  ImageProvider,
  ImageResult,
  // Auth
  TokenPayload,
  UserInfo,
  LoginRequest,
  RegisterRequest,
  GenerateRequest,
  // DB Rows
  UserRow,
  ContentRow,
  PromptTemplateRow,
  GenerationRow,
  // Misc
  ErrorType,
  AppError,
  ExportFormat,
  Exporter,
  Platform,
  Repository,
  GenerationRecord,
} from '@contentflow/shared/types';
