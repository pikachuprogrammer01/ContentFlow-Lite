# ContentFlow Lite — API 接口文档（全量 + 待开发清单）

> 最后更新：2026-07-05
> 格式：`模块-接口作用-测试方式`

---

## 符号说明

| 标记 | 含义 |
|------|------|
| ✅ | 已实现，可直接测试 |
| ❌ | 未实现，待开发 |

---

## 一、已实现接口（31 个，可直接测试）

### 健康检查（1 个）

| # | 接口名称 | 方法 | 路径 | Token | 限流 |
|---|---------|------|------|-------|------|
| 1 | ✅ Health-健康检查-mock | GET | `/health` | — | — |

### 认证模块（4 个）

| # | 接口名称 | 方法 | 路径 | Token | 限流 |
|---|---------|------|------|-------|------|
| 2 | ✅ Auth-用户注册-mock | POST | `/api/auth/register` | — | — |
| 3 | ✅ Auth-用户登录-mock | POST | `/api/auth/login` | — | 5/min/IP |
| 4 | ✅ Auth-获取个人信息-mock | GET | `/api/auth/me` | JWT | — |
| 5 | ✅ Auth-更新个人信息-mock | PUT | `/api/auth/me` | JWT | — |

### 内容模块（5 个）

| # | 接口名称 | 方法 | 路径 | Token | 限流 |
|---|---------|------|------|-------|------|
| 6 | ✅ Content-内容列表-mock | GET | `/api/content` | JWT | — |
| 7 | ✅ Content-内容详情-mock | GET | `/api/content/:id` | JWT | — |
| 8 | ✅ Content-保存新内容-mock | POST | `/api/content` | JWT | — |
| 9 | ✅ Content-更新内容-mock | PUT | `/api/content/:id` | JWT | — |
| 10 | ✅ Content-删除内容-mock | DELETE | `/api/content/:id` | JWT | — |

### 生成模块（1 个）

| # | 接口名称 | 方法 | 路径 | Token | 限流 |
|---|---------|------|------|-------|------|
| 11 | ✅ Generate-生成内容-Mock/Gemini/DeepSeek | POST | `/api/generate` | JWT | 10/min/用户 |

### Prompt 模板模块（6 个）

| # | 接口名称 | 方法 | 路径 | Token | 限流 |
|---|---------|------|------|-------|------|
| 12 | ✅ Prompt-模板列表-mock | GET | `/api/prompt/templates` | JWT | — |
| 13 | ✅ Prompt-创建模板-mock | POST | `/api/prompt/templates` | JWT | — |
| 14 | ✅ Prompt-模板详情-mock | GET | `/api/prompt/templates/:id` | JWT | — |
| 15 | ✅ Prompt-更新模板-mock | PUT | `/api/prompt/templates/:id` | JWT | — |
| 16 | ✅ Prompt-删除模板-mock | DELETE | `/api/prompt/templates/:id` | JWT | — |
| 17 | ✅ Prompt-版本列表-mock | GET | `/api/prompt/versions/:promptId` | JWT | — |

### 管理模块（14 个）

| # | 接口名称 | 方法 | 路径 | Token | 限流 |
|---|---------|------|------|-------|------|
| 18 | ✅ Admin-用户列表-mock | GET | `/api/admin/users` | JWT + admin+ | — |
| 19 | ✅ Admin-更新用户-mock | PUT | `/api/admin/users/:id` | JWT + admin+ | — |
| 20 | ✅ Admin-删除用户-mock | DELETE | `/api/admin/users/:id` | JWT + admin+ | — |
| 21 | ✅ Admin-重置用户密码-mock | POST | `/api/admin/users/:id/reset-password` | JWT + admin+ | 3/min/管理员 |
| 22 | ✅ Admin-内容列表-mock | GET | `/api/admin/contents` | JWT + admin+ | — |
| 23 | ✅ Admin-删除内容-mock | DELETE | `/api/admin/contents/:id` | JWT + admin+ | — |
| 24 | ✅ Admin-生成记录列表-mock | GET | `/api/admin/generation-records` | JWT + admin+ | — |
| 25 | ✅ Admin-Prompt模板列表-mock | GET | `/api/admin/prompt-templates` | JWT + admin+ | — |
| 26 | ✅ Admin-删除Prompt模板-mock | DELETE | `/api/admin/prompt-templates/:id` | JWT + admin+ | — |
| 27 | ✅ Admin-Prompt版本列表-mock | GET | `/api/admin/prompt-versions` | JWT + admin+ | — |
| 28 | ✅ Admin-批量删除内容-mock | POST | `/api/admin/contents/batch-delete` | JWT + super_admin | — |
| 29 | ✅ Admin-批量删除生成记录-mock | POST | `/api/admin/generation-records/batch-delete` | JWT + super_admin | — |
| 30 | ✅ Admin-清空生成记录-mock | POST | `/api/admin/generation-records/clear` | JWT + super_admin | — |
| 31 | ✅ Admin-批量删除Prompt模板-mock | POST | `/api/admin/prompt-templates/batch-delete` | JWT + super_admin | — |

---

## 二、待开发接口（19 个，按模块分组）

---

### 模块 A：认证模块（Auth）— 4 个

---

#### ❌ Auth-忘记密码发送重置链接-mock

| 维度 | 内容 |
|------|------|
| **接口地址** | `POST /api/auth/forgot-password` |
| **请求类型** | `POST` |
| **需要 Token** | 否 |
| **限流** | 5/min/IP |
| **描述** | 用户输入邮箱，系统发送密码重置链接（或验证码）。MVP 阶段可在控制台打印重置链接。 |

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | `string` | 是 | 用户注册邮箱，格式 `xxx@xxx.xxx`，长度 ≤ 255 |

**请求示例：**
```json
{
  "email": "user@example.com"
}
```

**成功响应 `200`：**
```json
{
  "message": "如果该邮箱已注册，重置链接已发送"
}
```

**错误响应 `400`：**
```json
{
  "error": {
    "code": "INPUT_ERROR",
    "message": "邮箱格式不正确"
  }
}
```

---

#### ❌ Auth-重置密码-mock

| 维度 | 内容 |
|------|------|
| **接口地址** | `POST /api/auth/reset-password` |
| **请求类型** | `POST` |
| **需要 Token** | 否（使用重置 token） |
| **限流** | 5/min/IP |
| **描述** | 凭重置 token 设置新密码。重置 token 一次性使用，有效期 15 分钟。 |

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `token` | `string` | 是 | 重置 token（从邮件/控制台获取） |
| `newPassword` | `string` | 是 | 新密码，6~128 字符 |

**请求示例：**
```json
{
  "token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "newPassword": "newPass123"
}
```

**成功响应 `200`：**
```json
{
  "message": "密码重置成功，请重新登录"
}
```

**错误响应 `400`：**
```json
{
  "error": {
    "code": "INPUT_ERROR",
    "message": "密码至少 6 个字符"
  }
}
```

**错误响应 `401`：**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "重置 token 无效或已过期"
  }
}
```

---

#### ❌ Auth-刷新Token-mock

| 维度 | 内容 |
|------|------|
| **接口地址** | `POST /api/auth/refresh` |
| **请求类型** | `POST` |
| **需要 Token** | JWT（当前 Token 未过期时可用） |
| **限流** | 10/min/用户 |
| **描述** | 使用当前有效 JWT 换取新的 JWT，延长会话。 |

**请求参数：** 无（Token 从 Authorization Header 读取）

**请求示例：**
```
Authorization: Bearer <当前JWT>
```

**成功响应 `200`：**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**错误响应 `401`：**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token 无效"
  }
}
```

---

#### ❌ Auth-用户登出-mock

| 维度 | 内容 |
|------|------|
| **接口地址** | `POST /api/auth/logout` |
| **请求类型** | `POST` |
| **需要 Token** | JWT |
| **限流** | — |
| **描述** | 登出当前用户。后端将当前 Token 加入黑名单（或 Redis 过期列表）。 |

**请求参数：** 无（Token 从 Authorization Header 读取）

**请求示例：**
```
Authorization: Bearer <当前JWT>
```

**成功响应 `200`：**
```json
{
  "message": "登出成功"
}
```

---

### 模块 B：生成模块（Generate）— 1 个

---

#### ❌ Generate-重新生成-Mock/Gemini/DeepSeek

| 维度 | 内容 |
|------|------|
| **接口地址** | `POST /api/generate/:contentId/regenerate` |
| **请求类型** | `POST` |
| **需要 Token** | JWT |
| **限流** | 10/min/用户 |
| **描述** | 对已有内容重新生成。保留 topic / platform 等元信息，重新走 Workflow Pipeline。 |

**请求参数（URL）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `contentId` | `string` (UUID) | 是 | 已有内容 ID |

**请求参数（Body）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `provider` | `string` | 是 | AI Provider 名称，如 `mock` / `gemini` / `deepseek` |
| `extraRequirements` | `string` | 否 | 新的补充要求 |
| `promptId` | `string` | 否 | 指定 Prompt 模板 ID |

**请求示例：**
```json
{
  "provider": "gemini",
  "extraRequirements": "标题需要更吸引眼球，每页加图片描述"
}
```

**成功响应 `200`：**
```json
{
  "data": {
    "id": "a1b2c3d4-...",
    "topic": "武功山徒步喝什么",
    "platform": "xiaohongshu",
    "titles": [
      { "text": "武功山徒步，这5种饮品绝了！", "score": 9.2 }
    ],
    "cover": {
      "text": "封面文案...",
      "imagePrompt": "A mountain hiker drinking water...",
      "imageUrl": null,
      "imageStatus": "pending"
    },
    "pages": [
      { "index": 1, "text": "正文内容...", "imagePrompt": "配图 prompt...", "imageUrl": null, "imageStatus": "pending" }
    ],
    "tags": ["#武功山", "#徒步"],
    "metadata": {
      "promptVersion": "V2",
      "model": "gemini-2.0-flash",
      "generatedAt": "2026-07-05T10:30:00Z",
      "regenerateCount": 1
    }
  }
}
```

---

### 模块 C：内容模块补充（Content）— 3 个

---

#### ❌ Content-导出Markdown-mock

| 维度 | 内容 |
|------|------|
| **接口地址** | `GET /api/content/:id/export/markdown` |
| **请求类型** | `GET` |
| **需要 Token** | JWT |
| **限流** | — |
| **描述** | 将指定内容导出为 Markdown 格式。返回文件流或纯文本。 |

**请求参数（URL）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` (UUID) | 是 | 内容 ID |

**请求示例：**
```
GET /api/content/a1b2c3d4-.../export/markdown
Authorization: Bearer <JWT>
```

**成功响应 `200`：**
```markdown
# 武功山徒步喝什么

> 封面文案...

## 标题候选
- 武功山徒步，这5种饮品绝了！
- ...

---

## 正文

### 第1页
正文内容...

### 第2页
...
```

**错误响应 `404`：**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "内容不存在"
  }
}
```

---

#### ❌ Content-导出JSON-mock

| 维度 | 内容 |
|------|------|
| **接口地址** | `GET /api/content/:id/export/json` |
| **请求类型** | `GET` |
| **需要 Token** | JWT |
| **限流** | — |
| **描述** | 将指定内容导出为 JSON 格式（即 Content DTO 的序列化结果）。 |

**请求参数（URL）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` (UUID) | 是 | 内容 ID |

**请求示例：**
```
GET /api/content/a1b2c3d4-.../export/json
Authorization: Bearer <JWT>
```

**成功响应 `200`：**
```json
{
  "id": "a1b2c3d4-...",
  "topic": "武功山徒步喝什么",
  "platform": "xiaohongshu",
  "titles": [...],
  "cover": {...},
  "pages": [...],
  "tags": [...],
  "metadata": {...}
}
```

---

#### ❌ Content-批量删除-mock

| 维度 | 内容 |
|------|------|
| **接口地址** | `DELETE /api/content` |
| **请求类型** | `DELETE` |
| **需要 Token** | JWT |
| **限流** | — |
| **描述** | 批量删除当前用户的多条内容。 |

**请求参数（Body）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `ids` | `string[]` | 是 | 内容 ID 数组，最多 100 条 |

**请求示例：**
```json
{
  "ids": ["a1b2-...", "c3d4-...", "e5f6-..."]
}
```

**成功响应 `200`：**
```json
{
  "data": {
    "deleted": 3,
    "failed": 0
  }
}
```

**错误响应 `400`：**
```json
{
  "error": {
    "code": "INPUT_ERROR",
    "message": "ids 必须是非空数组，最多 100 条"
  }
}
```

---

### 模块 D：设置模块（Settings）— 全新模块

---

#### ❌ Settings-获取当前设置-mock

| 维度 | 内容 |
|------|------|
| **接口地址** | `GET /api/settings` |
| **请求类型** | `GET` |
| **需要 Token** | JWT |
| **限流** | — |
| **描述** | 获取当前登录用户的个人设置（含已配置的 AI Provider Key 掩码）。 |

**请求参数：** 无

**请求示例：**
```
GET /api/settings
Authorization: Bearer <JWT>
```

**成功响应 `200`：**
```json
{
  "data": {
    "userId": "a1b2c3d4-...",
    "defaultProvider": "gemini",
    "defaultPlatform": "xiaohongshu",
    "providers": {
      "gemini": { "configured": true, "keyMask": "AIza****abcd" },
      "deepseek": { "configured": true, "keyMask": "sk-****wxyz" },
      "siliconflow": { "configured": false, "keyMask": null }
    }
  }
}
```

---

#### ❌ Settings-更新设置-mock

| 维度 | 内容 |
|------|------|
| **接口地址** | `PUT /api/settings` |
| **请求类型** | `PUT` |
| **需要 Token** | JWT |
| **限流** | — |
| **描述** | 更新用户的默认 Provider、默认平台等设置。 |

**请求参数（Body）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `defaultProvider` | `string` | 否 | 默认 AI Provider 名称 |
| `defaultPlatform` | `string` | 否 | 默认平台，如 `xiaohongshu` / `douyin` / `shipinhao` |

**请求示例：**
```json
{
  "defaultProvider": "deepseek",
  "defaultPlatform": "douyin"
}
```

**成功响应 `200`：**
```json
{
  "data": {
    "updated": true
  }
}
```

---

#### ❌ Settings-配置Provider Key-mock

| 维度 | 内容 |
|------|------|
| **接口地址** | `PUT /api/settings/providers/:provider` |
| **请求类型** | `PUT` |
| **需要 Token** | JWT |
| **限流** | — |
| **描述** | 为当前用户配置指定 Provider 的 API Key。Key 使用 AES-256-GCM 加密存储。 |

**请求参数（URL）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `provider` | `string` | 是 | Provider 名称：`gemini` / `deepseek` / `siliconflow` / `tongyi` |

**请求参数（Body）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `apiKey` | `string` | 是 | Provider 的 API Key |

**请求示例：**
```json
{
  "apiKey": "sk-1234567890abcdef"
}
```

**成功响应 `200`：**
```json
{
  "data": {
    "provider": "deepseek",
    "configured": true
  }
}
```

**错误响应 `404`：**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "不支持的 Provider: unknown-provider"
  }
}
```

---

#### ❌ Settings-删除Provider Key-mock

| 维度 | 内容 |
|------|------|
| **接口地址** | `DELETE /api/settings/providers/:provider` |
| **请求类型** | `DELETE` |
| **需要 Token** | JWT |
| **限流** | — |
| **描述** | 删除当前用户指定 Provider 的已配置 API Key。 |

**请求参数（URL）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `provider` | `string` | 是 | Provider 名称 |

**请求示例：**
```
DELETE /api/settings/providers/deepseek
Authorization: Bearer <JWT>
```

**成功响应 `200`：**
```json
{
  "data": {
    "provider": "deepseek",
    "deleted": true
  }
}
```

---

### 模块 E：图片模块（Image）— 全新模块

---

#### ❌ Image-生成图片-通义万相

| 维度 | 内容 |
|------|------|
| **接口地址** | `POST /api/image/generate` |
| **请求类型** | `POST` |
| **需要 Token** | JWT |
| **限流** | 5/min/用户 |
| **描述** | 调用通义万相 2.0 根据 prompt 生成图片。返回图片 ID 用于后续状态查询。 |

**请求参数（Body）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `prompt` | `string` | 是 | 图片生成 prompt，1~2000 字符 |
| `contentId` | `string` | 否 | 关联的内容 ID（用于内容配图） |
| `pageIndex` | `number` | 否 | 关联的页面索引（封面 = -1，正文 = 1~8） |
| `size` | `string` | 否 | 图片尺寸，默认 `1024x1024` |

**请求示例：**
```json
{
  "prompt": "A mountain hiker drinking water at sunrise, warm golden light, 4K realistic photography style",
  "contentId": "a1b2c3d4-...",
  "pageIndex": -1
}
```

**成功响应 `201`：**
```json
{
  "data": {
    "imageId": "img-abc123-...",
    "status": "generating",
    "estimatedTime": 15
  }
}
```

---

#### ❌ Image-查询图片状态-mock

| 维度 | 内容 |
|------|------|
| **接口地址** | `GET /api/image/:id/status` |
| **请求类型** | `GET` |
| **需要 Token** | JWT |
| **限流** | — |
| **描述** | 查询图片生成任务的状态。完成时返回图片 URL。 |

**请求参数（URL）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` | 是 | 图片任务 ID |

**请求示例：**
```
GET /api/image/img-abc123-.../status
Authorization: Bearer <JWT>
```

**处理中 `200`：**
```json
{
  "data": {
    "imageId": "img-abc123-...",
    "status": "generating"
  }
}
```

**已完成 `200`：**
```json
{
  "data": {
    "imageId": "img-abc123-...",
    "status": "done",
    "imageUrl": "https://cdn.example.com/images/abc123.png",
    "generatedAt": "2026-07-05T10:32:00Z"
  }
}
```

**生成失败 `200`：**
```json
{
  "data": {
    "imageId": "img-abc123-...",
    "status": "failed",
    "error": "内容审核未通过"
  }
}
```

---

### 模块 F：发布模块（Publish）— 全新模块

---

#### ❌ Publish-发布内容-mock

| 维度 | 内容 |
|------|------|
| **接口地址** | `POST /api/publish` |
| **请求类型** | `POST` |
| **需要 Token** | JWT |
| **限流** | 10/min/用户 |
| **描述** | 记录一次内容发布（手动复制到平台后的发布记录）。 |

**请求参数（Body）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `contentId` | `string` | 是 | 已发布的内容 ID |
| `platform` | `string` | 是 | 发布平台：`xiaohongshu` / `douyin` / `shipinhao` / `weibo` |
| `publishUrl` | `string` | 否 | 发布后的链接 |
| `notes` | `string` | 否 | 备注 |

**请求示例：**
```json
{
  "contentId": "a1b2c3d4-...",
  "platform": "xiaohongshu",
  "publishUrl": "https://www.xiaohongshu.com/explore/abc123",
  "notes": "下午3点发布，数据不错"
}
```

**成功响应 `201`：**
```json
{
  "data": {
    "id": "pub-efgh5678-...",
    "publishedAt": "2026-07-05T15:00:00Z"
  }
}
```

---

#### ❌ Publish-发布记录列表-mock

| 维度 | 内容 |
|------|------|
| **接口地址** | `GET /api/publish/records` |
| **请求类型** | `GET` |
| **需要 Token** | JWT |
| **限流** | — |
| **描述** | 获取当前用户的发布记录列表，按时间倒序。 |

**请求参数（Query）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `limit` | `number` | 否 | 每页条数，默认 20，最大 100 |
| `offset` | `number` | 否 | 偏移量，默认 0 |
| `platform` | `string` | 否 | 按发布平台筛选 |

**请求示例：**
```
GET /api/publish/records?limit=10&offset=0&platform=xiaohongshu
Authorization: Bearer <JWT>
```

**成功响应 `200`：**
```json
{
  "data": [
    {
      "id": "pub-efgh5678-...",
      "contentId": "a1b2c3d4-...",
      "topic": "武功山徒步喝什么",
      "platform": "xiaohongshu",
      "publishUrl": "https://www.xiaohongshu.com/explore/abc123",
      "publishedAt": "2026-07-05T15:00:00Z",
      "notes": "下午3点发布"
    }
  ]
}
```

---

#### ❌ Publish-发布记录详情-mock

| 维度 | 内容 |
|------|------|
| **接口地址** | `GET /api/publish/records/:id` |
| **请求类型** | `GET` |
| **需要 Token** | JWT |
| **限流** | — |
| **描述** | 获取单条发布记录详情。 |

**请求参数（URL）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` | 是 | 发布记录 ID |

**请求示例：**
```
GET /api/publish/records/pub-efgh5678-...
Authorization: Bearer <JWT>
```

**成功响应 `200`：**
```json
{
  "data": {
    "id": "pub-efgh5678-...",
    "contentId": "a1b2c3d4-...",
    "topic": "武功山徒步喝什么",
    "platform": "xiaohongshu",
    "publishUrl": "https://www.xiaohongshu.com/explore/abc123",
    "publishedAt": "2026-07-05T15:00:00Z",
    "notes": "下午3点发布，数据不错",
    "createdAt": "2026-07-05T15:00:05Z"
  }
}
```

---

### 模块 G：管理模块补充（Admin）— 2 个

---

#### ❌ Admin-系统统计-mock

| 维度 | 内容 |
|------|------|
| **接口地址** | `GET /api/admin/stats` |
| **请求类型** | `GET` |
| **需要 Token** | JWT + admin+ |
| **限流** | — |
| **描述** | 获取全站统计数据（用户数、内容数、生成次数等），仅 admin 及以上可访问。 |

**请求参数：** 无

**请求示例：**
```
GET /api/admin/stats
Authorization: Bearer <JWT>
```

**成功响应 `200`：**
```json
{
  "data": {
    "totalUsers": 128,
    "activeUsers7d": 45,
    "totalContents": 1024,
    "totalGenerations": 3892,
    "totalPublishes": 512,
    "avgGenerationTime": 42.5,
    "byPlatform": {
      "xiaohongshu": 580,
      "douyin": 320,
      "shipinhao": 124
    }
  }
}
```

---

#### ❌ Admin-查看应用日志-mock

| 维度 | 内容 |
|------|------|
| **接口地址** | `GET /api/admin/logs` |
| **请求类型** | `GET` |
| **需要 Token** | JWT + admin+ |
| **限流** | — |
| **描述** | 查看系统应用日志（从 `app_logs` 表读取），支持按级别和日期筛选，仅 admin 及以上可访问。 |

**请求参数（Query）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `limit` | `number` | 否 | 每页条数，默认 50，最大 200 |
| `offset` | `number` | 否 | 偏移量，默认 0 |
| `level` | `string` | 否 | 日志级别：`error` / `warn` / `info` / `debug` / `trace` |
| `startDate` | `string` | 否 | 起始日期，ISO 8601 格式 |
| `endDate` | `string` | 否 | 结束日期，ISO 8601 格式 |
| `module` | `string` | 否 | 模块名筛选，如 `auth` / `workflow` / `provider` |

**请求示例：**
```
GET /api/admin/logs?limit=20&level=error&startDate=2026-07-01T00:00:00Z
Authorization: Bearer <JWT>
```

**成功响应 `200`：**
```json
{
  "data": [
    {
      "id": 12345,
      "level": "error",
      "module": "provider",
      "message": "Gemini API 调用失败: 429 Too Many Requests",
      "userId": "a1b2c3d4-...",
      "trace": "Error: 429 Too Many Requests\n    at GeminiProvider.call (/app/server/providers/gemini-provider.ts:45:13)",
      "createdAt": "2026-07-05T10:30:00Z"
    }
  ],
  "total": 1
}
```

---

## 三、汇总统计

| 模块 | 已实现 | 待开发 | 合计 |
|------|--------|--------|------|
| 健康检查 | 1 | 0 | 1 |
| 认证 (Auth) | 4 | 4 | 8 |
| 内容 (Content) | 5 | 3 | 8 |
| 生成 (Generate) | 1 | 1 | 2 |
| Prompt 模板 | 6 | 0 | 6 |
| 管理 (Admin) | 14 | 2 | 16 |
| 设置 (Settings) | 0 | 4 | 4 |
| 图片 (Image) | 0 | 2 | 2 |
| 发布 (Publish) | 0 | 3 | 3 |
| **合计** | **31** | **19** | **50** |

---

## 四、开发优先级建议

| 优先级 | 模块 | 接口数 | 理由 |
|--------|------|--------|------|
| 🔴 P0 | Settings（设置） | 4 | 用户自定义 API Key 是 MVP 核心功能，无此功能用户只能用系统 Key |
| 🔴 P0 | Content-导出 Markdown | 1 | PRD 明确要求 Markdown 导出 |
| 🟡 P1 | Generate-重新生成 | 1 | 核心体验，用户高频需求 |
| 🟡 P1 | Image（图片生成） | 2 | PRD 明确要求通义万相，但依赖 Provider 开发 |
| 🟡 P1 | Auth-忘记/重置密码 | 2 | 用户自主找回密码，减少管理员负担 |
| 🟢 P2 | Publish（发布记录） | 3 | 发布追踪，提升运营效率 |
| 🟢 P2 | Content-导出 JSON | 1 | 配合 Markdown 导出 |
| 🟢 P2 | Admin-统计/日志 | 2 | 运维管理需求 |
| 🔵 P3 | Auth-刷新Token/登出 | 2 | 安全增强，非 MVP 阻塞项 |
| 🔵 P3 | Content-批量删除 | 1 | 效率提升，非 MVP 阻塞 |
