/**
 * server/types.ts — 后端类型入口
 *
 * 所有共享类型定义在 @contentflow/shared。
 * 本文件做重导出 + 后端独有类型补充。
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
  Platform,
} from '@contentflow/shared';
