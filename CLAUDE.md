# ContentFlow Lite - CLAUDE.md

## 系统定位

ContentFlow Lite 是一个基于 Workflow 的结构化 AI 内容生成框架，核心三要素：

- **Workflow** — 7 节点 Pipeline 流程编排（Input → Prompt → Provider → Parse → Validate → DTO → Output）
- **Prompt Version** — 提示词版本控制，每次修改生成新版本，不可覆盖
- **Content DTO** — 统一数据结构，所有 AI 输出必须转换为此格式

---

## 执行原则（最高优先级）

1. **先读规则，再动手** — 根据任务类型读取 `.rules/` 下对应模块，理解约束后再编码
2. **所有生成必须经过 Workflow** — 不允许绕过 Workflow 直接调用 Provider
3. **所有 AI 输出必须转为 Content DTO** — 系统只能存在一套 Content DTO
4. **Prompt 修改 = 新版本** — 永远不覆盖已有 Prompt Version
5. **按职责分层，不跨层** — 路由只做校验 → Repository 只做 CRUD → Provider 只做调用

---

## 规则索引

根据任务类型读取对应规则文件（均在 `.rules/` 下）：

| 任务类型 | 规则文件 | 关键约束 |
|---------|---------|---------|
| Workflow / 生成流程 | `workflow.mdc` | 7 节点串行、Validate 重试 ≤3 次、数据流单向 |
| Prompt / 模板 | `prompt.mdc` | Template 结构、OutputSchema、版本不可覆盖 |
| 数据结构 / DTO | `architecture.mdc` | Content DTO 唯一定义、Page/Title/Cover 结构 |
| UI / 前端 | `ui.mdc` | Naive UI 优先、UI 只渲染 DTO、禁止业务逻辑 |
| 编码规范 | `coding.mdc` | TypeScript 严格模式、Vue Composition API、分层约束 |
| AI Provider | `provider.mdc` | 用户手动选择 Provider、不自动切换、Key 即用 |
| 后端 / 数据库 | `backend.mdc` | Express 分层、8 张表、JWT + bcrypt、限流 |
| 日志 | `logging.mdc` | Winston 5 级日志、禁止 console.log、DB Transport |
| Phase Gate | `docs/PHASE_GATE.md` | `pnpm phase:advance` 唯一入口、禁手动改 .phase |

补充参考：
- **类型定义** → `docs/types.md`（FinalPrompt / OutputSchema / Provider 接口等）
- **项目进度** → `PROGRESS.md`（当前 Phase + 待完成任务）
- **API 文档** → 后端 JSDoc 注释自动生成 Scalar UI（`/api-docs`），不单独维护手写文档

---

## 系统执行链路

```
前端 UI (Vue 3 + Naive UI)
 ↓  POST /api/generate
Express 后端 (JWT → Rate Limit → Workflow)
 ↓  7 节点 Pipeline
Provider 层 (Gemini 2.0 Flash / DeepSeek V4 Flash)
 ↓  原始文本
Parser → Validate (失败重试 ≤3) → Content DTO
 ↓
持久化 (MySQL 兼容 DB) + 返回前端
```

---

## 硬性约束

### 代码边界

- **前端不处理业务逻辑** — 只负责渲染 DTO 和用户交互
- **后端路由不含业务逻辑** — 只做参数校验，业务在 Workflow/Service 层
- **数据库操作走 Repository** — 不允许在路由或 Workflow 中直接写 SQL
- **Provider 不可绕过** — 所有 AI 调用必须通过 Provider 接口，不做裸调 SDK
- **原生 API 必须封装** — 浏览器 API（fetch/localStorage）和 Node API（fs/path/crypto）只要超过一处使用，必须封装为统一模块，禁止散落裸调

### 数据边界

- **Content DTO 唯一** — 不存在第二套内容数据结构
- **Prompt 不可覆盖** — 每次修改生成新的 `prompt_versions` 记录
- **前后端类型各自维护** — `server/types.ts` 是后端 source of truth，`client/src/types/` 对齐 API 契约

### 操作边界

- **禁止手动改 `.phase`** — Phase 推进必须走 `pnpm phase:advance`
- **禁止 `git push --no-verify`** — 绕过 pre-push hook 的 push 会被 CI 拦截
- **禁止 `console.log`** — 必须通过 Logger 模块（前端 `loglevel`，后端 `winston`）
- **每完成一个 Milestone 更新 `PROGRESS.md`**

### 安全边界

- JWT Token 存 localStorage + helmet CSP 防 XSS
- 密码 bcrypt (cost=12)，API Key AES-256-GCM 加密存储
- 限流：登录 5/min/IP，生成 10/min/用户
- 数据库不可用时 App 不可用（无离线模式，不做 localStorage 缓存）

---

## 技术栈速览

| 层 | 技术 |
|----|------|
| 前端 | Vue 3 + Naive UI + Pinia + Vite（`client/`） |
| 后端 | Express 5 + TypeScript + tsx（`server/`） |
| 数据库 | MySQL 兼容（TiDB / MariaDB / PlanetScale）— 8 张表 |
| 认证 | JWT（jsonwebtoken）+ bcryptjs |
| AI | Gemini 2.0 Flash / DeepSeek V4 Flash（用户手动选择） |
| 日志 | Winston（5 级 + DB Transport） |
| 包管理 | pnpm workspace（`pnpm-workspace.yaml`） |
