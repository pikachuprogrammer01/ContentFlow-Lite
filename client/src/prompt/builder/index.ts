/**
 * Prompt Builder — 系统唯一允许生成 Prompt 的模块
 *
 * 职责：
 * - 读取 Template
 * - 注入运行时变量
 * - 注入 Metadata
 * - 绑定 Prompt Version
 * - 生成 FinalPrompt
 */

import type { FinalPrompt, PromptTemplate, PromptVariables, WorkflowInput } from '@/types';
import { getPromptVersion } from '@/prompt/version';

/**
 * 根据输入参数构建 FinalPrompt
 */
export async function buildFinalPrompt(input: WorkflowInput): Promise<FinalPrompt> {
  // 1. 获取 Prompt Version
  const version = await getPromptVersion(input.promptId, input.promptVersion);

  // 2. 获取 Template
  const template = version.content;

  // 3. 注入运行时变量
  const variables: PromptVariables = {
    topic: input.topic,
    platform: input.platform,
    extraRequirements: input.extraRequirements,
  };

  const systemPrompt = replaceVariables(template.systemPrompt, variables);
  const userPrompt = replaceVariables(template.userPrompt, variables);

  return {
    systemPrompt,
    userPrompt,
    version,
  };
}

/**
 * 变量替换 —— 将 {{key}} 替换为实际值
 */
export function replaceVariables(template: string, variables: PromptVariables): string {
  let result = template;

  result = result.replace(/\{\{topic\}\}/g, variables.topic);
  result = result.replace(/\{\{platform\}\}/g, variables.platform);
  result = result.replace(/\{\{audience\}\}/g, variables.audience ?? '');
  result = result.replace(/\{\{tone\}\}/g, variables.tone ?? '');
  result = result.replace(/\{\{extraRequirements\}\}/g, variables.extraRequirements ?? '');

  return result;
}

/**
 * 构建完整的 System Prompt（注入输出格式要求）
 */
export function buildSystemPrompt(template: PromptTemplate): string {
  return template.systemPrompt;
}
