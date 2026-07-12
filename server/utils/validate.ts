/**
 * server/utils/validate.ts — 输入校验工具
 *
 * 所有用户输入必须经过本模块校验后再进入业务逻辑。
 * 原则：不相信前端，后端独立校验所有输入。
 */

// ── 常量 ──────────────────────────────────────────────────

const USERNAME_RE = /^[a-zA-Z0-9_\u4e00-\u9fff]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const USERNAME_MIN = 2;
const USERNAME_MAX = 30;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 128;
const EMAIL_MAX = 255;

// ── 校验结果 ──────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  /** trim + normalize 后的安全值 */
  values: Record<string, string>;
}

/** 快捷构造：单条错误 */
export function fail(field: string, message: string): ValidationResult {
  return { valid: false, errors: [{ field, message }], values: {} };
}

/** 快捷构造：全部通过 */
export function pass(values: Record<string, string>): ValidationResult {
  return { valid: true, errors: [], values };
}

// ── 各字段校验函数 ───────────────────────────────────────

export function validateUsername(raw: unknown): ValidationResult {
  if (raw === undefined || raw === null || raw === '') {
    return fail('username', '用户名不能为空');
  }
  if (typeof raw !== 'string') {
    return fail('username', '用户名必须是字符串');
  }
  const v = raw.trim();
  if (!v) return fail('username', '用户名不能为空');
  if (v.length < USERNAME_MIN) return fail('username', `用户名至少 ${USERNAME_MIN} 个字符`);
  if (v.length > USERNAME_MAX) return fail('username', `用户名不能超过 ${USERNAME_MAX} 个字符`);
  if (!USERNAME_RE.test(v)) return fail('username', '用户名只能包含中文、英文、数字和下划线');
  return pass({ username: v });
}

export function validatePassword(raw: unknown): ValidationResult {
  if (raw === undefined || raw === null || raw === '') {
    return fail('password', '密码不能为空');
  }
  if (typeof raw !== 'string') {
    return fail('password', '密码必须是字符串');
  }
  if (raw.length < PASSWORD_MIN) return fail('password', `密码至少 ${PASSWORD_MIN} 个字符`);
  if (raw.length > PASSWORD_MAX) return fail('password', `密码不能超过 ${PASSWORD_MAX} 个字符`);
  return pass({ password: raw });
}

export function validateEmail(raw: unknown): ValidationResult {
  if (raw === undefined || raw === null || raw === '') {
    return fail('email', '邮箱不能为空');
  }
  if (typeof raw !== 'string') {
    return fail('email', '邮箱必须是字符串');
  }
  const v = raw.trim().toLowerCase();
  if (!v) return fail('email', '邮箱不能为空');
  if (v.length > EMAIL_MAX) return fail('email', '邮箱地址过长');
  if (!EMAIL_RE.test(v)) return fail('email', '邮箱格式不正确');
  return pass({ email: v });
}

// ── 组合校验 ──────────────────────────────────────────────

/**
 * 校验注册输入。返回 { valid, errors, values }。
 * values 中均为 trim/normalize 后的安全值。
 */
export function validateRegisterInput(body: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = [];
  const values: Record<string, string> = {};

  const fields: Array<{ key: string; validator: (v: unknown) => ValidationResult }> = [
    { key: 'username', validator: validateUsername },
    { key: 'password', validator: validatePassword },
    { key: 'email', validator: validateEmail },
  ];

  for (const { key, validator } of fields) {
    const r = validator(body[key]);
    if (!r.valid) {
      errors.push(...r.errors);
    } else {
      Object.assign(values, r.values);
    }
  }

  // adminKey 可选，不做格式校验，仅清洗
  if (body.adminKey !== undefined && typeof body.adminKey === 'string') {
    values.adminKey = body.adminKey.trim();
  }

  if (errors.length > 0) {
    return { valid: false, errors, values };
  }

  return { valid: true, errors: [], values };
}

/**
 * 校验登录输入。
 */
export function validateLoginInput(body: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = [];
  const values: Record<string, string> = {};

  const u = validateUsername(body.username);
  if (!u.valid) { errors.push(...u.errors); } else { Object.assign(values, u.values); }

  const p = validatePassword(body.password);
  if (!p.valid) { errors.push(...p.errors); } else { Object.assign(values, p.values); }

  if (errors.length > 0) {
    return { valid: false, errors, values };
  }
  return { valid: true, errors: [], values };
}

/**
 * 校验更新个人信息输入（PUT /api/auth/me）。
 */
export function validateProfileInput(body: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = [];
  const values: Record<string, string> = {};

  let hasField = false;

  if (body.username !== undefined) {
    hasField = true;
    const r = validateUsername(body.username);
    if (!r.valid) { errors.push(...r.errors); } else { Object.assign(values, r.values); }
  }

  if (body.email !== undefined) {
    hasField = true;
    const r = validateEmail(body.email);
    if (!r.valid) { errors.push(...r.errors); } else { Object.assign(values, r.values); }
  }

  if (!hasField) {
    return fail('_form', '至少需要提供 username 或 email');
  }

  if (errors.length > 0) {
    return { valid: false, errors, values };
  }

  return { valid: true, errors: [], values };
}
