/**
 * @contentflow/shared/types/workflow — Workflow 类型
 */

import type { FinalPrompt } from './prompt.js';
import type { Content } from './content.js';

// ══════════════════════════════════════════════════════════════
// Error
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
// Node & Context
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
