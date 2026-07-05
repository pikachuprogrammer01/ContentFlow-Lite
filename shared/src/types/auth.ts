/**
 * @contentflow/shared/types/auth — 认证/用户相关类型
 */

// ══════════════════════════════════════════════════════════════
// JWT
// ══════════════════════════════════════════════════════════════

/** JWT Token 载荷 */
export interface TokenPayload {
  userId: string;
  role: 'super_admin' | 'admin' | 'user';
}

// ══════════════════════════════════════════════════════════════
// 前端展示
// ══════════════════════════════════════════════════════════════

/** 前端使用的用户信息（camelCase） */
export interface UserInfo {
  id: string;
  username: string;
  email: string;
  role: 'super_admin' | 'admin' | 'user';
  createdAt?: string;
}

// ══════════════════════════════════════════════════════════════
// 请求体
// ══════════════════════════════════════════════════════════════

/** 登录请求 */
export interface LoginRequest {
  username: string;
  password: string;
}

/** 注册请求 */
export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
  confirmPassword: string;
}

// ══════════════════════════════════════════════════════════════
// DB 行类型
// ══════════════════════════════════════════════════════════════

/** users 表行（snake_case） */
export interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: 'super_admin' | 'admin' | 'user';
  created_at: string;
  updated_at: string;
}
