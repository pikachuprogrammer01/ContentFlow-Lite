# ContentFlow Lite - CLAUDE.md

# 一、系统定位

ContentFlow Lite 是一个 AI 内容生成系统，核心基于：

- Workflow（流程编排）
- Prompt Version（提示词版本控制）
- Content DTO（统一数据结构）

---

# 二、Claude 执行原则（最高优先级）

Claude 在本项目中必须遵循：

1. 先读取 rules/ 下对应模块
2. 再理解当前任务目标
3. 再进入实现或修改
4. 所有输出必须符合 Content DTO
5. 所有生成必须经过 Workflow 逻辑

---

# 三、任务路由（逻辑级，不绑定代码）

## 1. Workflow 类任务

读取：

rules/workflow.mdc

关注内容：

- Workflow 生命周期
- Node 执行顺序
- 数据流（Input → Output）
- 错误处理机制

---

## 2. Prompt 类任务

读取：

rules/prompt.mdc

关注内容：

- Prompt Template 结构
- Prompt Builder 规则
- Prompt Version 管理
- 不同平台 Prompt 规范

---

## 3. 数据结构类任务（DTO）

读取：

rules/architecture.mdc（Content DTO 部分）

关注内容：

- Content 结构定义
- Metadata 规范
- Page / Title / Cover 结构
- DTO 唯一性原则

---

## 4. UI 类任务

读取：

rules/ui.mdc

关注内容：

- UI 只负责渲染 DTO
- 不允许业务逻辑
- Workflow 调用方式
- 状态管理规范

---

## 5. 工程规范类任务

读取：

rules/coding.mdc

关注内容：

- TypeScript 规范
- Vue 规范
- 目录结构原则
- 分层架构约束

---

## 6. AI Provider 类任务

读取：

rules/provider.mdc

关注内容：

- 默认模型配置（文字/图片）
- Provider 接口实现规范
- API Key 管理方式
- 模型切换与兜底策略
- 扩展现有 Provider 的规则

文本生成默认使用 Gemini 2.0 Flash（主）→ DeepSeek V4 Flash（兜底）。
图片生成默认使用硅基流动 FLUX.1 schnell（主）→ 阿里云通义万相（兜底）。

---

## 7. 后端 / 数据库类任务

读取：

rules/backend.mdc

关注内容：

- Express 后端架构与分层约束
- MySQL 兼容数据库 — 不绑定平台，支持本地 MySQL / TiDB / MariaDB / PlanetScale / RDS
- 六张核心表（users / contents / prompt_templates / prompt_versions / generation_records / user_settings）
- RESTful API 路由设计（含认证 / 管理接口）
- JWT 认证系统（登录 / 注册 / Token 刷新 / 路由守卫）
- AdminJS 数据库管理面板（仅 admin 可访问）
- 配置系统（.env + config.json 双层 + API Key 闭包缓存）
- 安全规范（bcrypt / rate limit / helmet / CORS / SQL 注入防护）
- 离线降级策略（数据库不可用时自动切换 localStorage）
- 后端禁止含业务逻辑（路由只做校验 → repository 只做 CRUD）

后端使用 Express + AdminJS，六张 MySQL 兼容表，前端 localStorage 作为离线降级。

---

# 四、系统执行链路（抽象级）

```text
UI
 ↓
Workflow
 ↓
Prompt Builder
 ↓
AI Model
 ↓
Parser
 ↓
Content DTO
 ↓
Export / Storage（前端 localStorage + 后端 MySQL 兼容数据库）
```

---

# 五、核心约束（非常重要）

Claude 必须始终遵守：

## 1. 所有生成行为必须通过 Workflow 概念执行。

---

## 2. AI 输出必须统一转换为 Content DTO。

---

## 3. 系统只能存在一套 Content DTO。

---

## 4. 任何 Prompt 修改必须生成新版本，不允许覆盖。

---

# 六、开发指导原则（现实层）

当进入代码实现阶段时，Claude 应遵循：

- 先分析 rules
- 再确定模块职责
- 再设计代码结构
- 最后实现功能

---

# 七、系统本质

ContentFlow Lite 的本质是：

> 一个基于 Workflow 的结构化 AI 内容生成框架

---