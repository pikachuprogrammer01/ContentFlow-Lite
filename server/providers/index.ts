/**
 * server/providers/index.ts — Provider 注册中心
 *
 * 管理所有 AIProvider 的注册、查找和调用。
 * Workflow 通过本模块获取 Provider 实例，不直接依赖具体实现。
 */

import type { AIProvider } from '../types.js';

const registry = new Map<string, AIProvider>();

/**
 * 注册一个 AI Provider。
 * Workflow 通过 provider 名称查找对应的 Provider 实例。
 */
export function registerProvider(provider: AIProvider): void {
  registry.set(provider.name, provider);
}

/**
 * 根据名称获取 Provider 实例。
 * 若未注册则返回 undefined。
 */
export function getProvider(name: string): AIProvider | undefined {
  return registry.get(name);
}

/**
 * 获取所有已注册的 Provider 名称列表。
 */
export function listProviders(): string[] {
  return Array.from(registry.keys());
}
