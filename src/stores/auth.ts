/**
 * src/stores/auth.ts — 认证状态管理
 *
 * 职责：
 * - JWT Token 管理（localStorage 持久化）
 * - 登录 / 注册 / 登出
 * - 启动时恢复用户信息（GET /api/auth/me）
 *
 * 单 Token 模式，无 refresh 机制。
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/utils/api-client';
import type { UserInfo } from '@/types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserInfo | null>(null);
  const token = ref<string | null>(localStorage.getItem('accessToken'));
  const loading = ref(false);

  const isAuthenticated = computed(() => !!token.value && !!user.value);

  /**
   * 登录
   */
  async function login(username: string, password: string): Promise<void> {
    const res = await api.post<{ user: UserInfo; accessToken: string }>(
      '/api/auth/login',
      { username, password },
    );
    token.value = res.accessToken;
    user.value = res.user;
    localStorage.setItem('accessToken', res.accessToken);
  }

  /**
   * 注册
   */
  async function register(
    username: string,
    password: string,
    email: string,
  ): Promise<void> {
    const res = await api.post<{ user: UserInfo; accessToken: string }>(
      '/api/auth/register',
      { username, password, email },
    );
    token.value = res.accessToken;
    user.value = res.user;
    localStorage.setItem('accessToken', res.accessToken);
  }

  /**
   * 使用已有 Token 获取用户信息（应用启动时调用）
   */
  async function fetchUser(): Promise<boolean> {
    if (!token.value) return false;
    loading.value = true;
    try {
      const res = await api.get<{ user: UserInfo }>('/api/auth/me');
      user.value = res.user;
      return true;
    } catch {
      logout();
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 登出
   */
  function logout(): void {
    token.value = null;
    user.value = null;
    localStorage.removeItem('accessToken');
  }

  return {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    register,
    fetchUser,
    logout,
  };
});
