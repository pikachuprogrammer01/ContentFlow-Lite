/**
 * src/utils/api-client.ts — API 请求封装
 *
 * 封装 fetch，自动处理：
 * - Authorization 头（从 localStorage 读取 token）
 * - 401 响应 → 清除 token 并跳转登录页
 * - JSON 请求/响应
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function getToken(): string | null {
  return localStorage.getItem('accessToken');
}

function redirectToLogin(): void {
  localStorage.removeItem('accessToken');
  // 使用 location 跳转，因为不在 Vue 组件上下文中
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: {
    code: string;
    message: string;
    detail?: unknown;
  };
}

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json: ApiResponse<T> = await res.json();

  if (!res.ok) {
    // 401 → 清除 token，跳转登录
    if (res.status === 401) {
      redirectToLogin();
    }

    throw new ApiError(
      json.error?.code || 'UNKNOWN_ERROR',
      json.error?.message || `HTTP ${res.status}`,
      res.status,
    );
  }

  return json.data as T;
}

// ── 快捷方法 ────────────────────────────────────────────

export const api = {
  get: <T = unknown>(path: string) => request<T>('GET', path),
  post: <T = unknown>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T = unknown>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T = unknown>(path: string) => request<T>('DELETE', path),
};
