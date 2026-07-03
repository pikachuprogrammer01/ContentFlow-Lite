# ContentFlow Lite PRD（Product Requirement Document）

## 项目背景

ContentFlow Lite 是一个面向 AI 内容创作者的轻量级内容生成工具，目标是在最少配置下完成从主题输入、Prompt 组装、AI 调用、内容解析、编辑、导出的一整套流程。

目前多数 AI 内容工具存在以下问题：

- Prompt 固定且不可管理；
- AI 输出格式不统一；
- 内容无法稳定复现；
- Prompt 调整后无法比较效果；
- 后续接入图片生成、Markdown、JSON 导出时需要大量重复开发。

因此需要建立统一的数据模型、Prompt 管理体系以及标准 Workflow，使整个项目具备可维护、可扩展、可复现的能力。

ContentFlow Lite 的定位不是 AI 平台，而是 AI 内容生产工作流工具。

***

# 产品目标

MVP 阶段实现以下目标：

- 用户注册登录
- 用户输入主题即可生成完整内容
- Prompt 可模板化管理
- 每次生成记录 Prompt Version
- 输出统一 Content 数据结构
- 支持编辑
- 支持重新生成
- 支持 Markdown 导出
- 支持 JSON 导出
- 数据库持久化存储
- 可视化数据库管理面板
- 用户可自定义 API Key 配置
- 忘记密码功能（二次确认后重置为默认密码）
- 图片生成（通义万相）
- 发布记录追踪
- 应用日志系统
- 保证后续能够扩展批量生成、更多平台模板

***

# 用户画像

## 内容创作者

特点：

- 高频生成内容
- 需要不断调整 Prompt
- 希望快速导出

需求：

- 一键生成
- 多版本标题
- 可编辑
- 可复制

***

## 自媒体运营

特点：

- 多平台发布
- 内容格式统一

需求：

- 标准结构输出
- Markdown 导出
- JSON 导出

***

## AI Prompt 调试者

特点：

- 经常修改 Prompt

需求：

- 比较 Prompt 效果
- 查看历史 Prompt
- 快速切换版本

***

# 使用流程

```
注册 / 登录
      │
      ▼
输入主题
      │
      ▼
选择平台模板
      │
      ▼
选择 Prompt Version
      │
      ▼
构建 Prompt
      │
      ▼
调用 AI
      │
      ▼
解析输出
      │
      ▼
生成统一 Content DTO
      │
      ▼
内容编辑
      │
      ▼
Markdown / JSON 导出
      │
      ▼
发布记录
      │
      ▼
持久化到 MySQL 兼容数据库

```

***

# 功能需求

## 0. 用户系统

支持：

- 用户注册（用户名 + 邮箱 + 密码）
- 用户登录（用户名或邮箱 + 密码）
- JWT Token 认证（access token 15min + refresh token 7d）
- 密码 bcrypt 哈希存储，永不明文
- 角色权限：admin / user
  - admin：可访问数据库管理面板、系统设置
  - user：使用内容生成功能

***

## 1. 首页

功能：

- 输入主题
- 输入补充要求
- 选择平台
- 选择 Prompt Version
- 开始生成

***

## 2. Prompt 管理

支持：

- 新建 Prompt
- 编辑 Prompt
- 删除 Prompt
- 设置默认 Prompt
- 查看 Prompt Version

Prompt Version 必须唯一。

每一次修改 Prompt 后均生成新的版本号。

例如：

V1

V2

V3

生成内容时必须记录：

- Prompt ID
- Prompt Version
- 创建时间

保证以后可以完全复现。

***

## 3. AI 内容生成

输入：

- Topic
- Platform
- Prompt Version

系统自动：

组装 Prompt

调用 AI

返回结果

***

## 4. 内容解析

AI 返回后统一解析。

禁止页面直接使用 AI 原始字符串。

所有数据必须转换为统一 DTO。

***

## 5. 内容编辑

支持：

标题编辑

正文编辑

标签编辑

封面文案编辑

分页编辑

***

## 6. 导出

支持：

Markdown

JSON

复制全文

***

## 6.5 发布记录

各内容平台（小红书/抖音/公众号）大多无开放发布 API，本系统不直接对接。改为：

- 编辑页提供「复制全文」「复制标题」「下载配图」快捷操作
- 用户手动到各平台发布后回系统标记「已发布」
- 记录发布平台、使用的标题、发布时间、备注
- 追踪一篇内容发布到了哪些平台

数据存储在 `publish_records` 表。

***

## 7. 系统设置

支持：

### 7.1 数据库配置

- 展示当前数据库连接信息（脱敏）
- 修改数据库连接配置（主机/端口/用户名/密码/数据库名）
- 测试连接按钮
- 保存后自动重连
- 配置存储在 config.json（不在代码中写死）

### 7.2 API Key 配置

- Gemini / DeepSeek / 硅基流动 / 通义万相 四个平台
- 所有 Key 脱敏展示（仅显示前后各 4 位）
- 存储到 user_settings 表（数据库）
- Redis 热缓存（可选，不存在则直接查 DB）
- 每个平台旁提供「查看账单」链接，跳转对应官网让用户自助查看余额

### 7.3 数据库管理

- AdminJS 面板（/admin）
- 自动展示所有表结构
- 支持记录浏览/新增/编辑/删除
- 仅 admin 角色可访问

### 7.4 安全要求

- bcrypt 密码哈希（cost=12）
- 全部 SQL 参数化查询（防注入）
- CORS 仅允许前端域名
- 登录接口限流（5 次/分钟/IP）
- HTTP 安全头（helmet）
- 请求体大小限制（10MB）
- API Key 脱敏展示

***

# 页面设计

## 首页

```
+--------------------------------+

Topic

Platform

Prompt Version

Generate

+--------------------------------+

```

***

## 编辑页

左侧：

内容列表

右侧：

标题

正文

分页

标签

封面

导出按钮

***

## 登录注册页

登录注册表单，支持用户名/邮箱 + 密码登录，JWT Token 认证。

***

## 设置页面

数据库配置（主机/端口/用户/密码/库名 + 测试连接）；API Key 配置（四平台脱敏展示 + 各平台账单跳转链接）；数据库管理（AdminJS /admin 面板入口）。

***

## Prompt 页面

列表：

Prompt 名称

Version

更新时间

操作

***

# 数据模型

## User

```
User

id

username

email

password_hash (bcrypt)

role (admin / user)

createdAt

updatedAt
```

***

## UserSettings

```
UserSettings

user_id

key (设置键，如 gemini_api_key)

value (设置值)

updatedAt
```

键值对存储，灵活扩展。

***

## PublishRecord

```
PublishRecord

id

user_id

content_id

platform (发布平台)

title_used (实际使用的标题)

published_at (发布时间)

notes (备注)

createdAt
```

记录内容发布轨迹。

***

## Prompt

```
Prompt

id

name

version

content

createTime

updateTime

```

***

## Generation Record

```
Generation

id

topic

platform

promptId

promptVersion

createTime

```

每一次生成必须记录 Prompt Version。

后续修改 Prompt 不影响历史数据。

***

## Content DTO

所有 AI 输出必须转换为统一 Content 数据结构。

禁止标题、正文、标签分别返回字符串。

统一 DTO 示例：

```
{
  "titles": [],
  "cover": {
    "title": "",
    "subtitle": ""
  },
  "pages": [
    {
      "title": "",
      "content": ""
    }
  ],
  "tags": [],
  "summary": "",
  "platform": "",
  "topic": ""
}

```

优势：

- Markdown 导出统一
- JSON 导出统一
- 图片生成统一
- 后续新增平台无需修改页面结构
- 后续支持批量生成

所有模块均围绕 Content DTO 工作。

***

# Workflow

```
用户输入
      │
      ▼
读取 Prompt Template
      │
      ▼
读取 Prompt Version
      │
      ▼
变量替换
      │
      ▼
生成最终 Prompt
      │
      ▼
调用 AI
      │
      ▼
返回 Raw Content
      │
      ▼
Parser
      │
      ▼
Content DTO
      │
      ▼
Editor
      │
      ▼
Exporter

```

整个流程中页面禁止直接依赖 AI 原始返回内容。

所有功能均基于 Content DTO。

***

# Prompt 体系

Prompt 分为：

## System Prompt

定义：

角色

规则

输出格式

禁止事项

***

## Template Prompt

定义：

不同平台模板。

例如：

小红书

抖音

公众号

知乎

***

## Runtime Prompt

运行时动态生成：

Topic

用户补充要求

Prompt Template

Prompt Version

最终组合后发送给 AI。

***

## Prompt Version

Prompt Version 是 Prompt 生命周期的重要组成部分。

要求：

每一次修改 Prompt 自动生成新版本。

生成内容时必须记录：

- Prompt Version
- Prompt ID
- 创建时间

历史内容必须能够根据 Prompt Version 完整复现生成环境。

Prompt Version 不允许覆盖历史版本，只允许新增。

***

# 非功能需求

性能：

生成请求响应正常。

代码：

模块化。

组件可复用。

安全：

bcrypt 密码哈希。

JWT 认证。

SQL 注入防护。

限流 + 安全响应头。

数据：

统一 DTO。

禁止多种格式混用。

扩展：

方便新增平台。

方便新增导出格式。

方便新增图片生成。

维护：

Prompt 独立管理。

Workflow 独立管理。

Parser 独立管理。

***

# 验收标准

满足以下条件即认为 MVP 完成。

能够注册账号。

能够登录 / 登出。

能够输入主题。

能够选择 Prompt。

能够选择 Prompt Version。

能够成功调用 AI。

能够生成统一 Content DTO。

能够编辑标题。

能够编辑正文。

能够编辑标签。

能够导出 Markdown。

能够导出 JSON。

能够记录 Prompt Version。

能够查看历史 Prompt。

能够配置 API Key。

能够查看数据库连接状态。

能够通过 AdminJS 管理数据库。

能够记录发布。

所有页面均基于统一 Content DTO。

***

# MVP 边界

本阶段不包含：

云端同步。

多人协作。

批量生成。

多模型切换。

Prompt A/B Test。

历史版本比较。

自动发布。

平台登录。

插件市场。

知识库。

RAG。

向量数据库。

---

# 部署方案

| 组件 | 平台 | 说明 |
|------|------|------|
| 前端 | GitHub Pages | 静态 SPA，vite build 后部署 |
| 后端 | Vercel | Express API，Node.js 运行时 |
| 数据库 | 用户自备 | MySQL 兼容数据库，通过 .env 配置连接 |

不做 Docker，不做移动端适配，不做国际化。

---

# Roadmap

## V1.0

完成：

- 发布记录

- 用户系统（注册/登录/JWT/忘记密码）
- Prompt 管理
- Prompt Version
- AI 内容生成
- Content DTO
- Markdown 导出
- JSON 导出

***

## V1.1

新增：

- 内容历史
- Prompt 对比
- 更多平台模板
- 导出优化

***

## V1.2

新增：

- 图片生成
- 封面生成
- 批量生成
- Prompt A/B Test

***

## V2.0

新增：

- 工作区
- 云端同步
- 多设备同步
- 多模型支持
- Workflow 可视化
- Prompt 市场
- 插件机制
- 自动发布能力

通过统一的 Prompt Version 管理和 Content DTO 数据结构，整个系统能够保证内容生成过程可追溯、可复现、可维护，同时为未来扩展图片生成、更多内容平台、自动化 Workflow 以及高级 Prompt 管理能力提供稳定的数据基础与架构支撑。
