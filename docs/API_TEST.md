# ContentFlow Lite — Apifox 测试接口文档（23 个未测接口）

> 生成时间：2026-07-05
> 说明：以下 23 个接口已实现但尚未在 Apifox 中测试，按模块列出。
> 接口名称格式：`模块-接口作用-角色身份`（普通用户 | 管理员 | 超级管理员）
> 
> ⚠️ **响应格式更新（2026-07-05）**：所有接口已统一为新信封格式
> `{ code, data, message }`（成功）/ `{ code, message[, error.data] }`（失败），详见 `docs/API_SPEC.md` §通用响应规范。
> 认证模块仍使用 `{ user, accessToken }` 特殊格式。

---

## 接口总览

| # | 接口名称 | 方法 | 路径 | Token |
|---|---------|------|------|-------|
| 1 | Auth-更新个人信息-普通用户 | PUT | `/api/auth/me` | JWT |
| 2 | Content-更新内容-普通用户 | PUT | `/api/content/:id` | JWT |
| 3 | Content-删除内容-普通用户 | DELETE | `/api/content/:id` | JWT |
| 4 | Prompt-创建模板-普通用户 | POST | `/api/prompt/templates` | JWT |
| 5 | Prompt-模板列表-普通用户 | GET | `/api/prompt/templates` | JWT |
| 6 | Prompt-模板详情-普通用户 | GET | `/api/prompt/templates/:id` | JWT |
| 7 | Prompt-更新模板-普通用户 | PUT | `/api/prompt/templates/:id` | JWT |
| 8 | Prompt-删除模板-普通用户 | DELETE | `/api/prompt/templates/:id` | JWT |
| 9 | Prompt-版本列表-普通用户 | GET | `/api/prompt/versions/:promptId` | JWT |
| 10 | Admin-用户列表-管理员 | GET | `/api/admin/users` | JWT + admin+ |
| 11 | Admin-更新用户-管理员 | PUT | `/api/admin/users/:id` | JWT + admin+ |
| 12 | Admin-删除用户-管理员 | DELETE | `/api/admin/users/:id` | JWT + admin+ |
| 13 | Admin-重置用户密码-管理员 | POST | `/api/admin/users/:id/reset-password` | JWT + admin+ |
| 14 | Admin-内容列表-管理员 | GET | `/api/admin/contents` | JWT + admin+ |
| 15 | Admin-删除内容-管理员 | DELETE | `/api/admin/contents/:id` | JWT + admin+ |
| 15a | Admin-内容详情-管理员 | GET | `/api/admin/contents/:id` | JWT + admin+ |
| 16 | Admin-生成记录列表-管理员 | GET | `/api/admin/generation-records` | JWT + admin+ |
| 17 | Admin-Prompt模板列表-管理员 | GET | `/api/admin/prompt-templates` | JWT + admin+ |
| 18 | Admin-删除Prompt模板-管理员 | DELETE | `/api/admin/prompt-templates/:id` | JWT + admin+ |
| 19 | Admin-Prompt版本列表-管理员 | GET | `/api/admin/prompt-versions` | JWT + admin+ |
| 20 | Admin-批量删除内容-超级管理员 | POST | `/api/admin/contents/batch-delete` | JWT + super_admin |
| 21 | Admin-批量删除生成记录-超级管理员 | POST | `/api/admin/generation-records/batch-delete` | JWT + super_admin |
| 22 | Admin-清空生成记录-超级管理员 | POST | `/api/admin/generation-records/clear` | JWT + super_admin |
| 23 | Admin-批量删除Prompt模板-超级管理员 | POST | `/api/admin/prompt-templates/batch-delete` | JWT + super_admin |

---

## 1. Auth-更新个人信息-普通用户

| 维度 | 内容 |
|------|------|
| **接口地址** | `PUT /api/auth/me` |
| **请求类型** | `PUT` |
| **需要 Token** | 是（JWT，Header: `Authorization: Bearer <token>`） |
| **限流** | 无 |
| **描述** | 更新当前登录用户的用户名和/或邮箱。至少提供一个字段。 |

### 请求参数（Body / JSON）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `username` | `string` | 否 | 新用户名，2~30 字符，允许中英文数字下划线 |
| `email` | `string` | 否 | 新邮箱，格式 `xxx@xxx.xxx`，长度 ≤ 255 |

### 请求示例

```json
{
  "username": "新用户名",
  "email": "newemail@example.com"
}
```

### 成功响应 `200`

```json
{
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "username": "新用户名",
    "email": "newemail@example.com",
    "role": "user",
    "createdAt": "2026-07-05T10:00:00.000Z"
  }
}
```

### 错误响应

**`400` — 输入校验失败：**
```json
{
  "code": "INPUT_ERROR",
  "message": "用户名至少 2 个字符",
  "error": { "data": [
      { "field": "username", "message": "用户名至少 2 个字符" }
    ] }
}
```

**`500` — 服务器错误：**
```json
{
  "code": "UNKNOWN_ERROR",
  "message": "更新用户信息失败"
}
```

---

## 2. Content-更新内容-普通用户

| 维度 | 内容 |
|------|------|
| **接口地址** | `PUT /api/content/:id` |
| **请求类型** | `PUT` |
| **需要 Token** | 是（JWT） |
| **限流** | 无 |
| **描述** | 更新已有内容。所有字段均可选，未提供的字段保留原值。 |

### 请求参数（URL）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` (UUID) | 是 | 内容 ID |

### 请求参数（Body / JSON）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `topic` | `any` | 否 | 主题 |
| `platform` | `any` | 否 | 平台名称 |
| `titles` | `any` | 否 | 标题数组 |
| `cover` | `any` | 否 | 封面对象 |
| `pages` | `any` | 否 | 正文页面数组 |
| `tags` | `any` | 否 | 标签数组 |
| `summary` | `any` | 否 | 摘要（传 `null` 会覆盖为空） |
| `extraRequirements` | `any` | 否 | 额外要求（传 `null` 会覆盖为空） |
| `metadata` | `any` | 否 | 元数据对象 |

### 请求示例

```json
{
  "topic": "新主题",
  "tags": ["#新标签1", "#新标签2"],
  "summary": "这是更新后的摘要"
}
```

### 成功响应 `200`

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

### 错误响应

**`404` — 内容不存在：**
```json
{
  "code": "NOT_FOUND",
  "message": "内容不存在"
}
```

**`500` — 服务器错误：**
```json
{
  "code": "UNKNOWN_ERROR",
  "message": "更新内容失败"
}
```

---

## 3. Content-删除内容-普通用户

| 维度 | 内容 |
|------|------|
| **接口地址** | `DELETE /api/content/:id` |
| **请求类型** | `DELETE` |
| **需要 Token** | 是（JWT） |
| **限流** | 无 |
| **描述** | 删除指定内容。仅可删除自己创建的内容。 |

### 请求参数（URL）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` (UUID) | 是 | 内容 ID |

### 请求示例

```
DELETE /api/content/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Authorization: Bearer <JWT>
```

### 成功响应 `200`

```json
{
  "data": {
    "deleted": true
  }
}
```

### 错误响应

**`404` — 内容不存在：**
```json
{
  "code": "NOT_FOUND",
  "message": "内容不存在"
}
```

**`500` — 服务器错误：**
```json
{
  "code": "UNKNOWN_ERROR",
  "message": "删除内容失败"
}
```

---

## 4. Prompt-创建模板-普通用户

| 维度 | 内容 |
|------|------|
| **接口地址** | `POST /api/prompt/templates` |
| **请求类型** | `POST` |
| **需要 Token** | 是（JWT） |
| **限流** | 无 |
| **描述** | 创建新的 Prompt 模板。 |

### 请求参数（Body / JSON）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | 是 | 模板名称 |
| `type` | `string` | 是 | 类型，只能为 `text` 或 `image` |
| `platform` | `string` | 是 | 目标平台，如 `xiaohongshu` |
| `systemPrompt` | `string` | 是 | 系统提示词 |
| `userPrompt` | `string` | 是 | 用户提示词（可含 `{{topic}}` 等变量） |
| `isDefault` | `boolean` | 否 | 是否设为默认模板 |

### 请求示例

```json
{
  "name": "小红书通用模板",
  "type": "text",
  "platform": "xiaohongshu",
  "systemPrompt": "你是一个小红书爆款内容创作者，擅长用 emoji 和短句吸引读者。",
  "userPrompt": "请为以下主题生成小红书风格的内容：{{topic}}。补充要求：{{extraRequirements}}。",
  "isDefault": true
}
```

### 成功响应 `201`

```json
{
  "data": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901"
  }
}
```

### 错误响应

**`400` — 缺少必填字段：**
```json
{
  "code": "INPUT_ERROR",
  "message": "缺少必填字段：name、type、platform、systemPrompt、userPrompt"
}
```

**`400` — type 不合法：**
```json
{
  "code": "INPUT_ERROR",
  "message": "type 只能是 text 或 image"
}
```

**`500` — 服务器错误：**
```json
{
  "code": "UNKNOWN_ERROR",
  "message": "创建模板失败"
}
```

---

## 5. Prompt-模板列表-普通用户

| 维度 | 内容 |
|------|------|
| **接口地址** | `GET /api/prompt/templates` |
| **请求类型** | `GET` |
| **需要 Token** | 是（JWT） |
| **限流** | 无 |
| **描述** | 获取当前用户的所有 Prompt 模板。 |

### 请求参数

无（Query 参数未实现）。

### 请求示例

```
GET /api/prompt/templates
Authorization: Bearer <JWT>
```

### 成功响应 `200`

```json
{
  "data": [
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "小红书通用模板",
      "type": "text",
      "platform": "xiaohongshu",
      "system_prompt": "你是一个小红书爆款内容创作者...",
      "user_prompt": "请为以下主题生成小红书风格的内容：{{topic}}...",
      "is_default": 1,
      "created_at": "2026-07-05T10:00:00.000Z",
      "updated_at": "2026-07-05T10:00:00.000Z"
    }
  ]
}
```

### 错误响应

**`500` — 服务器错误：**
```json
{
  "code": "UNKNOWN_ERROR",
  "message": "获取模板列表失败"
}
```

---

## 6. Prompt-模板详情-普通用户

| 维度 | 内容 |
|------|------|
| **接口地址** | `GET /api/prompt/templates/:id` |
| **请求类型** | `GET` |
| **需要 Token** | 是（JWT） |
| **限流** | 无 |
| **描述** | 获取单个 Prompt 模板详情。 |

### 请求参数（URL）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` (UUID) | 是 | 模板 ID |

### 请求示例

```
GET /api/prompt/templates/b2c3d4e5-f6a7-8901-bcde-f12345678901
Authorization: Bearer <JWT>
```

### 成功响应 `200`

```json
{
  "data": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "小红书通用模板",
    "type": "text",
    "platform": "xiaohongshu",
    "system_prompt": "你是一个小红书爆款内容创作者...",
    "user_prompt": "请为以下主题生成小红书风格的内容：{{topic}}...",
    "is_default": 1,
    "created_at": "2026-07-05T10:00:00.000Z",
    "updated_at": "2026-07-05T10:00:00.000Z"
  }
}
```

### 错误响应

**`404` — 模板不存在：**
```json
{
  "code": "NOT_FOUND",
  "message": "模板不存在"
}
```

**`500` — 服务器错误：**
```json
{
  "code": "UNKNOWN_ERROR",
  "message": "获取模板详情失败"
}
```

---

## 7. Prompt-更新模板-普通用户

| 维度 | 内容 |
|------|------|
| **接口地址** | `PUT /api/prompt/templates/:id` |
| **请求类型** | `PUT` |
| **需要 Token** | 是（JWT） |
| **限流** | 无 |
| **描述** | 更新模板字段，自动生成新版本快照（V1→V2→V3…）。所有字段可选。 |

### 请求参数（URL）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` (UUID) | 是 | 模板 ID |

### 请求参数（Body / JSON）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | 否 | 模板名称 |
| `platform` | `string` | 否 | 目标平台 |
| `systemPrompt` | `string` | 否 | 系统提示词 |
| `userPrompt` | `string` | 否 | 用户提示词 |
| `isDefault` | `boolean` | 否 | 是否设为默认 |

### 请求示例

```json
{
  "userPrompt": "请为以下主题生成小红书风格的内容：{{topic}}。额外要求：{{extraRequirements}}。输出需要包含 8 页以上正文。"
}
```

### 成功响应 `200`

```json
{
  "data": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "version": "V2"
  }
}
```

### 错误响应

**`404` — 模板不存在：**
```json
{
  "code": "NOT_FOUND",
  "message": "模板不存在"
}
```

**`500` — 服务器错误：**
```json
{
  "code": "UNKNOWN_ERROR",
  "message": "更新模板失败"
}
```

---

## 8. Prompt-删除模板-普通用户

| 维度 | 内容 |
|------|------|
| **接口地址** | `DELETE /api/prompt/templates/:id` |
| **请求类型** | `DELETE` |
| **需要 Token** | 是（JWT） |
| **限流** | 无 |
| **描述** | 删除模板及其所有版本快照。 |

### 请求参数（URL）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` (UUID) | 是 | 模板 ID |

### 请求示例

```
DELETE /api/prompt/templates/b2c3d4e5-f6a7-8901-bcde-f12345678901
Authorization: Bearer <JWT>
```

### 成功响应 `200`

```json
{
  "data": {
    "deleted": true
  }
}
```

### 错误响应

**`404` — 模板不存在：**
```json
{
  "code": "NOT_FOUND",
  "message": "模板不存在"
}
```

**`500` — 服务器错误：**
```json
{
  "code": "UNKNOWN_ERROR",
  "message": "删除模板失败"
}
```

---

## 9. Prompt-版本列表-普通用户

| 维度 | 内容 |
|------|------|
| **接口地址** | `GET /api/prompt/versions/:promptId` |
| **请求类型** | `GET` |
| **需要 Token** | 是（JWT） |
| **限流** | 无 |
| **描述** | 获取指定模板的所有版本快照列表。 |

### 请求参数（URL）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `promptId` | `string` (UUID) | 是 | 模板 ID |

### 请求示例

```
GET /api/prompt/versions/b2c3d4e5-f6a7-8901-bcde-f12345678901
Authorization: Bearer <JWT>
```

### 成功响应 `200`

```json
{
  "data": [
    {
      "id": "v1-uuid-string",
      "prompt_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "version": "V1",
      "snapshot": {
        "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "name": "小红书通用模板",
        "system_prompt": "你是一个小红书爆款内容创作者...",
        "user_prompt": "请为以下主题生成小红书风格的内容：{{topic}}..."
      },
      "created_at": "2026-07-05T10:00:00.000Z"
    },
    {
      "id": "v2-uuid-string",
      "prompt_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "version": "V2",
      "snapshot": {
        "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "name": "小红书通用模板",
        "system_prompt": "你是一个小红书爆款内容创作者...",
        "user_prompt": "请为以下主题生成...输出需要包含 8 页以上正文。"
      },
      "created_at": "2026-07-05T10:30:00.000Z"
    }
  ]
}
```

### 错误响应

**`500` — 服务器错误：**
```json
{
  "code": "UNKNOWN_ERROR",
  "message": "获取版本列表失败"
}
```

---

## 10. Admin-用户列表-管理员

| 维度 | 内容 |
|------|------|
| **接口地址** | `GET /api/admin/users` |
| **请求类型** | `GET` |
| **需要 Token** | 是（JWT，且用户角色为 `admin` 或 `super_admin`） |
| **限流** | 无 |
| **描述** | 获取用户列表。`admin` 只能看到 `user` 角色用户；`super_admin` 可看到全部用户。 |

### 请求参数

无（Query 参数未实现）。

### 请求示例

```
GET /api/admin/users
Authorization: Bearer <admin_or_super_admin_JWT>
```

### 成功响应 `200`

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "username": "普通用户",
      "email": "user@example.com",
      "role": "user",
      "createdAt": "2026-07-05T10:00:00.000Z"
    },
    {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "username": "另一个用户",
      "email": "another@example.com",
      "role": "user",
      "createdAt": "2026-07-04T08:00:00.000Z"
    }
  ]
}
```

### 错误响应

**`401` — 未认证：**
```json
{
  "code": "UNAUTHORIZED",
  "message": "未提供认证令牌"
}
```

**`403` — 权限不足：**
```json
{
  "code": "FORBIDDEN",
  "message": "需要管理员权限"
}
```

**`500` — 服务器错误：**
```json
{
  "code": "UNKNOWN_ERROR",
  "message": "获取用户列表失败"
}
```

---

## 11. Admin-更新用户-管理员

| 维度 | 内容 |
|------|------|
| **接口地址** | `PUT /api/admin/users/:id` |
| **请求类型** | `PUT` |
| **需要 Token** | 是（JWT + admin 或 super_admin 角色） |
| **限流** | 无 |
| **描述** | 管理员修改用户信息。仅 `super_admin` 可修改角色字段。 |

### 请求参数（URL）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` (UUID) | 是 | 目标用户 ID |

### 请求参数（Body / JSON）

| 参数 | 类型 | 必填 | 谁可以设置 | 说明 |
|------|------|------|------------|------|
| `username` | `string` | 否 | 所有人 | 2~30 字符，中英文数字下划线 |
| `email` | `string` | 否 | 所有人 | 邮箱格式，≤255 字符 |
| `role` | `string` | 否 | 仅 `super_admin` | 角色名，admin 传了也会被忽略 |

### 请求示例

```json
{
  "username": "修改后的用户名",
  "email": "updated@example.com"
}
```

### 成功响应 `200`

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "updated": true
  }
}
```

### 错误响应

**`400` — 无更新字段：**
```json
{
  "code": "INPUT_ERROR",
  "message": "无更新字段"
}
```

**`400` — 校验失败：**
```json
{
  "code": "INPUT_ERROR",
  "message": "用户名至少 2 个字符"
}
```

**`403` — admin 试图操作 super_admin：**
```json
{
  "code": "FORBIDDEN",
  "message": "无权操作超级管理员"
}
```

**`403` — admin 试图操作其他 admin：**
```json
{
  "code": "FORBIDDEN",
  "message": "无权操作其他管理员"
}
```

**`404` — 用户不存在：**
```json
{
  "code": "NOT_FOUND",
  "message": "用户不存在"
}
```

**`500` — 服务器错误：**
```json
{
  "code": "UNKNOWN_ERROR",
  "message": "更新用户失败"
}
```

---

## 12. Admin-删除用户-管理员

| 维度 | 内容 |
|------|------|
| **接口地址** | `DELETE /api/admin/users/:id` |
| **请求类型** | `DELETE` |
| **需要 Token** | 是（JWT + admin 或 super_admin 角色） |
| **限流** | 无 |
| **描述** | 管理员删除用户。不可删除自己、超级管理员；admin 不可删除其他 admin。 |

### 请求参数（URL）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` (UUID) | 是 | 目标用户 ID |

### 请求示例

```
DELETE /api/admin/users/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Authorization: Bearer <admin_or_super_admin_JWT>
```

### 成功响应 `200`

```json
{
  "data": {
    "deleted": true
  }
}
```

### 错误响应

**`400` — 试图删除自己：**
```json
{
  "code": "INPUT_ERROR",
  "message": "不能删除自己的账户"
}
```

**`403` — 试图删除 super_admin：**
```json
{
  "code": "FORBIDDEN",
  "message": "不能删除超级管理员"
}
```

**`403` — admin 试图删除其他 admin：**
```json
{
  "code": "FORBIDDEN",
  "message": "无权删除其他管理员"
}
```

**`404` — 用户不存在：**
```json
{
  "code": "NOT_FOUND",
  "message": "用户不存在"
}
```

**`500` — 服务器错误：**
```json
{
  "code": "UNKNOWN_ERROR",
  "message": "删除用户失败"
}
```

---

## 13. Admin-重置用户密码-管理员

| 维度 | 内容 |
|------|------|
| **接口地址** | `POST /api/admin/users/:id/reset-password` |
| **请求类型** | `POST` |
| **需要 Token** | 是（JWT + admin 或 super_admin 角色） |
| **限流** | 无 |
| **描述** | 管理员为用户重置密码。admin 不可重置 super_admin 的密码；admin 只可重置自己的密码，不可重置其他 admin 的密码。 |

### 请求参数（URL）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` (UUID) | 是 | 目标用户 ID |

### 请求参数（Body / JSON）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `newPassword` | `string` | 是 | 新密码，6~128 字符 |

### 请求示例

```json
{
  "newPassword": "newPass123"
}
```

### 成功响应 `200`

```json
{
  "data": {
    "reset": true
  }
}
```

### 错误响应

**`400` — 密码为空：**
```json
{
  "code": "INPUT_ERROR",
  "message": "新密码不能为空"
}
```

**`400` — 密码格式不合法：**
```json
{
  "code": "INPUT_ERROR",
  "message": "密码至少 6 个字符"
}
```

**`403` — 无权操作超级管理员：**
```json
{
  "code": "FORBIDDEN",
  "message": "无权操作超级管理员"
}
```

**`403` — admin 试图重置其他 admin 密码：**
```json
{
  "code": "FORBIDDEN",
  "message": "无权操作其他管理员"
}
```

**`404` — 用户不存在：**
```json
{
  "code": "NOT_FOUND",
  "message": "用户不存在"
}
```

**`500` — 服务器错误：**
```json
{
  "code": "UNKNOWN_ERROR",
  "message": "重置密码失败"
}
```

---

## 附录：测试准备

### 1. 获取 JWT Token

先调用 `POST /api/auth/login` 获取 token：

```json
// 请求
{
  "username": "你的用户名",
  "password": "你的密码"
}

// 响应
{
  "user": { "id": "...", "username": "...", "role": "user" },
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

将 `accessToken` 设置为 Apifox 的全局 Header：

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### 2. 测试 Admin 接口

Admin 接口需要 `admin` 或 `super_admin` 角色。用管理员账号登录获取 token。

### 3. 接口依赖关系

```
先创建模板（POST /api/prompt/templates）
  → 获取模板 ID
    → 查详情（GET .../:id）
    → 查版本列表（GET /api/prompt/versions/:promptId）
    → 更新模板（PUT .../:id）→ 生成新版本
    → 删除模板（DELETE .../:id）

先生成内容（POST /api/generate）
  → 获取内容 ID
    → 更新内容（PUT /api/content/:id）
    → 删除内容（DELETE /api/content/:id）

先有普通用户
  → 管理员获取列表（GET /api/admin/users）
    → 更新用户（PUT /api/admin/users/:id）
    → 重置密码（POST /api/admin/users/:id/reset-password）
    → 删除用户（DELETE /api/admin/users/:id）
```

---

## 14. Admin-内容列表-管理员

| 维度 | 内容 |
|------|------|
| **接口地址** | `GET /api/admin/contents` |
| **请求类型** | `GET` |
| **需要 Token** | 是（JWT + admin 或 super_admin 角色） |
| **限流** | 无 |
| **描述** | 管理员查看所有用户的内容列表，支持分页。 |

### 请求参数（Query）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | `number` | 否 | 页码，默认 1 |
| `limit` | `number` | 否 | 每页条数，默认 20，最大 100 |

### 请求示例

```
GET /api/admin/contents?page=1&limit=20
Authorization: Bearer <admin_JWT>
```

### 成功响应 `200`

```json
{
  "data": {
    "items": [
      {
        "id": "a1b2c3d4-...",
        "userId": "u1-uuid",
        "topic": "武功山徒步喝什么",
        "platform": "小红书",
        "summary": "摘要内容...",
        "tags": ["#武功山", "#徒步"],
        "createdAt": "2026-07-05T10:00:00Z",
        "titleCount": 10,
        "pageCount": 8
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
  }
}
```

---

## 15. Admin-删除内容-管理员

| 维度 | 内容 |
|------|------|
| **接口地址** | `DELETE /api/admin/contents/:id` |
| **请求类型** | `DELETE` |
| **需要 Token** | 是（JWT + admin 或 super_admin） |
| **限流** | 无 |
| **描述** | 管理员删除任意用户的内容。 |

### 成功响应 `200`

```json
{ "data": { "deleted": true } }
```

---

## 15a. Admin-内容详情-管理员

| 维度 | 内容 |
|------|------|
| **接口地址** | `GET /api/admin/contents/:id` |
| **请求类型** | `GET` |
| **需要 Token** | 是（JWT + admin 或 super_admin） |
| **限流** | 无 |
| **描述** | 管理员查看任意内容的完整详情（包含 titles/pages/cover/metadata 等完整字段）。 |

### 请求参数（Path）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` | 是 | 内容 UUID |

### 成功响应 `200`

```json
{
  "data": {
    "id": "c1-uuid",
    "topic": "武功山徒步喝什么",
    "platform": "xiaohongshu",
    "summary": "武功山徒步饮水推荐清单",
    "tags": ["徒步", "饮水", "武功山"],
    "titles": [
      { "id": "t1-uuid", "text": "武功山徒步，5款饮品拯救你的嗓子", "type": "main" }
    ],
    "cover": {
      "title": "武功山徒步喝水指南",
      "subtitle": "5款饮品实测推荐"
    },
    "pages": [
      { "id": "p1-uuid", "order": 1, "text": "武功山徒步，喝水是个大问题…" }
    ],
    "metadata": {
      "promptId": "p1-uuid",
      "promptVersion": "V2",
      "model": "gemini-2.0-flash",
      "platform": "xiaohongshu",
      "createdAt": "2026-07-05T10:00:00.000Z"
    }
  }
}
```

### 内容不存在 `404`

```json
{ "code": "NOT_FOUND", "message": "内容不存在" }
```

---

## 16. Admin-生成记录列表-管理员

| 维度 | 内容 |
|------|------|
| **接口地址** | `GET /api/admin/generation-records` |
| **请求类型** | `GET` |
| **需要 Token** | 是（JWT + admin 或 super_admin） |
| **限流** | 无 |
| **描述** | 管理员查看所有用户的 AI 生成记录（只读），支持分页。 |

### 请求参数（Query）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | `number` | 否 | 页码，默认 1 |
| `limit` | `number` | 否 | 每页条数，默认 20，最大 100 |

### 成功响应 `200`

```json
{
  "data": {
    "items": [
      {
        "id": "gen-uuid",
        "userId": "u1-uuid",
        "contentId": "c1-uuid",
        "topic": "武功山徒步喝什么",
        "platform": "小红书",
        "promptId": "p1-uuid",
        "promptVersion": "V2",
        "model": "gemini-2.0-flash",
        "createdAt": "2026-07-05T10:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 50, "totalPages": 3 }
  }
}
```

---

## 17. Admin-Prompt模板列表-管理员

| 维度 | 内容 |
|------|------|
| **接口地址** | `GET /api/admin/prompt-templates` |
| **请求类型** | `GET` |
| **需要 Token** | 是（JWT + admin 或 super_admin） |
| **限流** | 无 |
| **描述** | 管理员查看所有用户的 Prompt 模板，支持分页。 |

### 请求参数（Query）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | `number` | 否 | 页码，默认 1 |
| `limit` | `number` | 否 | 每页条数，默认 20，最大 100 |

### 成功响应 `200`

```json
{
  "data": {
    "items": [
      {
        "id": "t1-uuid",
        "userId": "u1-uuid",
        "name": "小红书通用模板",
        "type": "text",
        "platform": "小红书",
        "isDefault": true,
        "updatedAt": "2026-07-05T10:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 15, "totalPages": 1 }
  }
}
```

---

## 18. Admin-删除Prompt模板-管理员

| 维度 | 内容 |
|------|------|
| **接口地址** | `DELETE /api/admin/prompt-templates/:id` |
| **请求类型** | `DELETE` |
| **需要 Token** | 是（JWT + admin 或 super_admin） |
| **限流** | 无 |
| **描述** | 管理员删除任意用户的 Prompt 模板，级联删除所有版本快照。 |

### 成功响应 `200`

```json
{ "data": { "deleted": true } }
```

---

## 19. Admin-Prompt版本列表-管理员

| 维度 | 内容 |
|------|------|
| **接口地址** | `GET /api/admin/prompt-versions` |
| **请求类型** | `GET` |
| **需要 Token** | 是（JWT + admin 或 super_admin） |
| **限流** | 无 |
| **描述** | 管理员查看所有用户的 Prompt 版本快照（只读），关联显示模板名称和平台，支持分页。 |

### 请求参数（Query）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | `number` | 否 | 页码，默认 1 |
| `limit` | `number` | 否 | 每页条数，默认 20，最大 100 |

### 成功响应 `200`

```json
{
  "data": {
    "items": [
      {
        "id": "v1-uuid",
        "promptId": "t1-uuid",
        "version": "V2",
        "templateName": "小红书通用模板",
        "platform": "小红书",
        "createdAt": "2026-07-05T10:30:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 30, "totalPages": 2 }
  }
}
```


## 20. Admin-批量删除内容-超级管理员

| 维度 | 内容 |
|------|------|
| **接口地址** | `POST /api/admin/contents/batch-delete` |
| **请求类型** | `POST` |
| **需要 Token** | 是（JWT + **super_admin** 角色，admin 不可调用） |
| **限流** | 无 |
| **描述** | 超级管理员根据 ID 列表批量删除任意用户的内容。 |

### 请求参数（Body / JSON）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `ids` | `string[]` | 是 | 内容 ID 数组，至少 1 个 |

### 请求示例

```json
{
  "ids": [
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "b2c3d4e5-f6a7-8901-bcde-f12345678901"
  ]
}
```

### 成功响应 `200`

```json
{
  "data": {
    "deleted": 2
  }
}
```

### 错误响应

**`400` — ids 为空：**
```json
{
  "code": "INPUT_ERROR",
  "message": "ids 不能为空"
}
```

**`403` — admin 尝试调用（非 super_admin）：**
```json
{
  "code": "FORBIDDEN",
  "message": "需要超级管理员权限"
}
```

**`500` — 服务器错误：**
```json
{
  "code": "UNKNOWN_ERROR",
  "message": "批量删除内容失败"
}
```


## 21. Admin-批量删除生成记录-超级管理员

| 维度 | 内容 |
|------|------|
| **接口地址** | `POST /api/admin/generation-records/batch-delete` |
| **请求类型** | `POST` |
| **需要 Token** | 是（JWT + **super_admin** 角色） |
| **限流** | 无 |
| **描述** | 超级管理员根据 ID 列表批量删除生成记录。 |

### 请求参数（Body / JSON）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `ids` | `string[]` | 是 | 生成记录 ID 数组，至少 1 个 |

### 请求示例

```json
{
  "ids": [
    "gen-uuid-001",
    "gen-uuid-002"
  ]
}
```

### 成功响应 `200`

```json
{
  "data": {
    "deleted": 2
  }
}
```

### 错误响应

**`400` — ids 为空：**
```json
{
  "code": "INPUT_ERROR",
  "message": "ids 不能为空"
}
```

**`403` — 权限不足（admin 或 user 调用）：**
```json
{
  "code": "FORBIDDEN",
  "message": "需要超级管理员权限"
}
```

**`500` — 服务器错误：**
```json
{
  "code": "UNKNOWN_ERROR",
  "message": "批量删除生成记录失败"
}
```


## 22. Admin-清空生成记录-超级管理员

| 维度 | 内容 |
|------|------|
| **接口地址** | `POST /api/admin/generation-records/clear` |
| **请求类型** | `POST` |
| **需要 Token** | 是（JWT + **super_admin** 角色） |
| **限流** | 无 |
| **描述** | 超级管理员清空全部生成记录（⚠️ 高危操作，不可逆）。 |

### 请求参数

无（Body 为空对象 `{}` 或留空）。

### 请求示例

```
POST /api/admin/generation-records/clear
Authorization: Bearer <super_admin_JWT>
Content-Type: application/json

{}
```

### 成功响应 `200`

```json
{
  "data": {
    "cleared": 42
  }
}
```

### 错误响应

**`403` — 权限不足：**
```json
{
  "code": "FORBIDDEN",
  "message": "需要超级管理员权限"
}
```

**`500` — 服务器错误：**
```json
{
  "code": "UNKNOWN_ERROR",
  "message": "清空生成记录失败"
}
```


## 23. Admin-批量删除Prompt模板-超级管理员

| 维度 | 内容 |
|------|------|
| **接口地址** | `POST /api/admin/prompt-templates/batch-delete` |
| **请求类型** | `POST` |
| **需要 Token** | 是（JWT + **super_admin** 角色） |
| **限流** | 无 |
| **描述** | 超级管理员根据 ID 列表批量删除 Prompt 模板，级联删除所有版本快照。 |

### 请求参数（Body / JSON）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `ids` | `string[]` | 是 | Prompt 模板 ID 数组，至少 1 个 |

### 请求示例

```json
{
  "ids": [
    "t1-uuid-001",
    "t2-uuid-002"
  ]
}
```

### 成功响应 `200`

```json
{
  "data": {
    "deleted": 2
  }
}
```

### 错误响应

**`400` — ids 为空：**
```json
{
  "code": "INPUT_ERROR",
  "message": "ids 不能为空"
}
```

**`403` — 权限不足：**
```json
{
  "code": "FORBIDDEN",
  "message": "需要超级管理员权限"
}
```

**`500` — 服务器错误：**
```json
{
  "code": "UNKNOWN_ERROR",
  "message": "批量删除模板失败"
}
```


## 附录二：跨接口权限边界测试

> 目的：验证三级角色（user / admin / super_admin）的接口访问控制是否正确。
> 所需账号：一个 `user`、一个 `admin`、一个 `super_admin`。

| # | 测试场景 | 用谁的身份 | 调哪个接口 | 预期 HTTP 码 | 预期 code |
|---|---------|-----------|-----------|-------------|----------|
| P1 | 普通用户访问 Admin 接口 | `user` 的 Token | `GET /api/admin/users` | `403` | `FORBIDDEN` |
| P2 | 普通用户访问超级管理员接口 | `user` 的 Token | `POST /api/admin/contents/batch-delete` | `403` | `FORBIDDEN` |
| P3 | admin 访问超级管理员接口 | `admin` 的 Token | `POST /api/admin/generation-records/clear` | `403` | `FORBIDDEN` |
| P4 | admin 试图修改其他 admin | `admin` 的 Token | `PUT /api/admin/users/:id`（id=另一个 admin） | `403` | `FORBIDDEN` |
| P5 | admin 试图修改 super_admin | `admin` 的 Token | `PUT /api/admin/users/:id`（id=super_admin） | `403` | `FORBIDDEN` |
| P6 | admin 试图删除 super_admin | `admin` 的 Token | `DELETE /api/admin/users/:id`（id=super_admin） | `403` | `FORBIDDEN` |
| P7 | super_admin 修改其他 admin | `super_admin` 的 Token | `PUT /api/admin/users/:id`（id=admin） | `200` | — |
| P8 | super_admin 删除 admin | `super_admin` 的 Token | `DELETE /api/admin/users/:id`（id=admin） | `200` | — |
| P9 | 普通用户访问自己的 content | `user` 的 Token | `GET /api/content` | `200` | — |
| P10 | 普通用户访问他人的 content/:id | `user` 的 Token | `GET /api/content/:id`（别人的 ID） | `404` | `NOT_FOUND` |


## 附录三：通用异常场景矩阵

> 目的：覆盖不绑定具体接口的通用异常处理。

| # | 场景 | 触发方式 | 预测响应 | 预期 HTTP 码 |
|---|------|---------|---------|-------------|
| E1 | Token 缺失 | 不传 `Authorization` 头调任意认证接口 | `{ code: "UNAUTHORIZED", message: "未提供认证令牌" }` | `401` |
| E2 | Token 格式错误 | `Authorization: Bearer malformed_token` | `{ code: "UNAUTHORIZED", message: "无效的认证令牌" }` | `401` |
| E3 | Token 过期 | 等 24h 后或用过期 token | `{ code: "UNAUTHORIZED", message: "认证令牌已过期" }` | `401` |
| E4 | 请求体不是 JSON | `Content-Type: text/plain` + 纯文本 body | `{ code: "INPUT_ERROR", message: "请求体必须是 JSON 格式" }` | `400` |
| E5 | 超大请求体 | 发送 >10MB 的 body | 请求被拒绝（helmet/express 拦截） | `413` |
| E6 | 不存在的路由 | `GET /api/nonexistent` | `{ code: "NOT_FOUND", message: "接口不存在" }` | `404` |
| E7 | 限流触发（登录） | 连续 6 次 `POST /api/auth/login`（同一 IP，1 分钟内） | `{ code: "RATE_LIMIT", message: "登录尝试过于频繁" }` | `429` |
| E8 | 限流触发（生成） | 连续 11 次 `POST /api/generate`（同一用户，1 分钟内） | `{ code: "RATE_LIMIT", message: "生成请求过于频繁" }` | `429` |
| E9 | SQL 注入尝试 | `username` 传 `'; DROP TABLE users; --` | 正常校验返回 `INPUT_ERROR` | `400` |
| E10 | XSS 尝试 | `topic` 传 `<script>alert('xss')</script>` | 正常保存，前端渲染时转义 | `200` |
| E11 | 重复删除（幂等性） | 删一个已删除的 content | `{ code: "NOT_FOUND", message: "内容不存在" }` | `404` |
| E12 | 空分页列表 | `GET /api/content`（没有任何 content 的用户） | `{ data: { items: [], pagination: { total: 0 } } }` | `200` |
