/**
 * src/utils/api-client.ts — API 请求封装
 *
 * 默认使用 axios，自动处理：
 * - Authorization 头（从 storage 读取 token）
 * - 401 响应 → 清除 token 并跳转登录页
 * - JSON 请求/响应 + 统一错误格式
 *
 * fetch 版本保留为 fetchApi，供无需 axios 的场景使用。
 */

import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { storage } from './storage';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ── Token 管理 ────────────────────────────────────────────

function getToken(): string | null {
  return storage.get('accessToken');
}

function redirectToLogin(): void {
  storage.remove('accessToken');
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

// ── axios 实例 ────────────────────────────────────────────

const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截：自动注入 Authorization
axiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截：统一错误处理 + 401 跳转
axiosInstance.interceptors.response.use(
  (res) => {
    // 新信封格式：{ code: 200, data: {...}, message: "..." }
    // 解包 data 层；特殊格式（无 data 字段，如认证模块）直接透传
    return res.data?.data ?? res.data;
  },
  (err) => {
    if (err.response?.status === 401) {
      redirectToLogin();
    }
    // 新信封格式：{ code: "ERROR_CODE", message: "..." }
    // 兼容旧格式：{ error: { code, message } }
    const body = err.response?.data || {};
    const code = body.code || body.error?.code || 'UNKNOWN_ERROR';
    const message = body.message || body.error?.message || err.message || `HTTP ${err.response?.status || 'error'}`;
    return Promise.reject(new ApiError(code, message, err.response?.status || 0));
  },
);

// ── 公开方法 ──────────────────────────────────────────────

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

/** 默认 API 客户端（axios） */
export const api = {
  get: <T = unknown>(path: string, config?: AxiosRequestConfig) =>
    axiosInstance.get<T, T>(path, config),
  post: <T = unknown>(path: string, body?: unknown, config?: AxiosRequestConfig) =>
    axiosInstance.post<T, T>(path, body, config),
  put: <T = unknown>(path: string, body?: unknown, config?: AxiosRequestConfig) =>
    axiosInstance.put<T, T>(path, body, config),
  delete: <T = unknown>(path: string, config?: AxiosRequestConfig) =>
    axiosInstance.delete<T, T>(path, config),
};

// ── fetch 版本（保留，供参考或无 axios 场景）───────────────

async function fetchRequest<T = unknown>(
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
    if (res.status === 401) {
      redirectToLogin();
    }
    throw new ApiError(
      json.error?.code || 'UNKNOWN_ERROR',
      json.error?.message || `HTTP ${res.status}`,
      res.status,
    );
  }

  return (json.data ?? json) as unknown as T;
}

/** fetch 版本的 API 客户端（保留备用） */
export const fetchApi = {
  get: <T = unknown>(path: string) => fetchRequest<T>('GET', path),
  post: <T = unknown>(path: string, body?: unknown) => fetchRequest<T>('POST', path, body),
  put: <T = unknown>(path: string, body?: unknown) => fetchRequest<T>('PUT', path, body),
  delete: <T = unknown>(path: string) => fetchRequest<T>('DELETE', path),
};
