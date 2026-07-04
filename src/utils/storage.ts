/**
 * src/utils/storage.ts — localStorage 封装
 *
 * 统一管理浏览器持久化存储，所有模块通过此文件读写，
 * 禁止直接使用 localStorage。
 *
 * 自动添加 `cfl_` 前缀，避免键名冲突。
 */

const PREFIX = 'cfl_';

export const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(PREFIX + key);
    } catch {
      return null;
    }
  },

  set(key: string, value: string): void {
    try {
      localStorage.setItem(PREFIX + key, value);
    } catch {
      // 静默失败（存储满或隐私模式下不可用）
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      // 静默失败
    }
  },

  /** 清除所有带 cfl_ 前缀的键 */
  clearAll(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // 静默失败
    }
  },
};
