# ContentFlow Lite — 实现进度追踪

> 最后更新：2026-07-04
> 基于 `docs/PRD.md`、`docs/SPEC.md`、`.rules/` 全部规范

---

## 状态图例

| 符号 | 含义 |
|------|------|
| ✅ | 已完成，已验证 |
| 🔵 | 骨架/占位代码存在，但需重构或替换 |
| ⚠️ | 部分实现，仍有缺口 |
| ❌ | 未开始 |

---

## 一、总体状态概览（2026-07-03）

| 模块 | 状态 | 位置 | 说明 |
|------|------|------|------|
| **文档体系** | ✅ | `docs/` `.rules/` `CLAUDE.md` | PRD/SPEC/13 个 rules 文件/CLAUDE.md/types.md 全部就绪 |
| **前端骨架** | 🔵 | `src/` | 初始化代码存在，但基于旧架构（MockProvider/localStorage/6 节点），需整体重构 |
| **后端** | ✅ | `server/` | Phase 1 已完成：Auth + Workflow + Provider + Repository + API 全部就绪 |
| **数据库** | ✅ | TiDB Cloud | 8 张表 SQL + 连接池 + 4 个 Repository 已实现，真实 TiDB 云端连接验证通过 |
| **认证系统** | ✅ | `server/routes/auth.ts` | JWT + bcrypt，注册/登录/刷新/me 4 个端点 |
| **AI Provider** | 🔵 | `server/providers/` | Mock + Gemini + DeepSeek 已实现（2/4 真实 Provider），硅基流动/通义万相待 Phase 3 |
| **Workflow** | ✅ | `server/workflow/` | 7 节点后端 Pipeline（Input→Prompt→Provider→Parse→Validate→DTO→Output），含 Validate 失败重试 |
| **测试** | ❌ | — | Vitest 未安装，无测试用例 |

### 现状诚实评估

Phase 0+1 已完成，后端核心链路跑通：

- ✅ Express 服务启动 + TiDB Cloud 连接
- ✅ JWT 认证系统（注册/登录/刷新/me）
- ✅ 7 节点 Workflow Pipeline（含 Mock/Gemini/DeepSeek 三个 Provider）
- ✅ POST /api/generate → Content DTO 端到端验证通过

`src/` 下的前端代码仍是旧架构骨架（纯前端、localStorage、Mock AI），不可直接用。Phase 2 将从零重构前端：Naive UI + 后端 API 对接。

---

## 二、分模块状态明细

### A. 文档层 ✅

| 文件 | 行数 | 状态 | 核心内容 |
|------|------|------|---------|
| `docs/PRD.md` | ~830 | ✅ | 产品目标、用户流程、功能需求、MVP边界、部署方案 |
| `docs/SPEC.md` | ~2100 | ✅ | 完整技术规范、架构分层、API设计、Workflow 7节点、Content DTO |
| `docs/types.md` | ~320 | ✅ | 所有跨模块 TS 类型唯一定义（FinalPrompt/OutputSchema/Provider/Repository等） |
| `CLAUDE.md` | ~240 | ✅ | 任务路由 9 大类、执行链路、核心约束 |
| `.rules/backend.mdc` | ~750 | ✅ | Express/MySQL/AdminJS/8张表/JWT/CSP/限流/配置系统 |
| `.rules/provider.mdc` | ~300 | ✅ | 4个Provider规范、SDK依赖、baseURL、无自动切换 |
| `.rules/workflow.mdc` | ~350 | ✅ | 7节点Pipeline、上下文溢出预案、tiktoken估算 |
| `.rules/prompt.mdc` | ~450 | ✅ | Template结构、OutputSchema（recursive）、版本规则、图片prompt规则 |
| `.rules/ui.mdc` | ~200 | ✅ | Naive UI选型、UI职责边界、状态管理 |
| `.rules/coding.mdc` | ~200 | ✅ | TS/Vue编码规范、分层架构约束 |
| `.rules/architecture.mdc` | ~250 | ✅ | Content DTO定义、模块边界、依赖方向 |
| `.rules/project.mdc` | ~80 | ✅ | 默认模型摘要、后端技术栈、前端技术栈 |
| `.rules/logging.mdc` | ~120 | ✅ | winston+loglevel、5级日志、Custom MySQL Transport |

---

### B. 数据库层 ✅

| # | 表 | 文档位置 | 代码 | 状态 |
|---|---|---|---|---|
| B1 | `users` | backend.mdc §3.1 | `server/db/schema.ts` | ✅ |
| B2 | `contents` | backend.mdc §3.2 | `server/db/schema.ts` | ✅ |
| B3 | `prompt_templates` | backend.mdc §3.3 | `server/db/schema.ts` | ✅ |
| B4 | `prompt_versions` | backend.mdc §3.4 | `server/db/schema.ts` | ✅ |
| B5 | `generation_records` | backend.mdc §3.5 | `server/db/schema.ts` | ✅ |
| B6 | `user_settings` | backend.mdc §3.6 | `server/db/schema.ts` | ✅ |
| B7 | `publish_records` | backend.mdc §3.7 | `server/db/schema.ts` | ✅ |
| B8 | `app_logs` | backend.mdc §3.8 | `server/db/schema.ts` | ✅ |
| — | `server/db/schema.ts` | backend.mdc §二 | `server/db/schema.ts` | ✅ 8 张表 CREATE TABLE IF NOT EXISTS |
| — | `server/db/client.ts` (mysql2) | backend.mdc §二 | `server/db/client.ts` | ✅ mysql2 连接池 + TiDB Cloud SSL |
| — | `server/db/repositories/*` | backend.mdc §二 | 4 个 repo 文件 | ✅ user/content/prompt/generation CRUD |

---

### C. 后端 Express API 🔵

| # | 文件 | 路由 | 状态 |
|---|---|---|---|
| C1 | `server/index.ts` | 入口 | ✅ Phase 0 |
| C2 | `server/app.ts` | Express 配置 | ✅ Phase 0 |
| C3 | `server/routes/auth.ts` | /api/auth/* (4 路由) | ✅ 注册/登录/me/刷新（重置密码待 Phase 2） |
| C4 | `server/routes/content.ts` | /api/content/* | ❌ Phase 2 |
| C5 | `server/routes/prompt.ts` | /api/prompt/* | ❌ Phase 2 |
| C6 | `server/routes/generate.ts` | POST /api/generate | ✅ 含认证 + 限流 + 存入 DB |
| C7 | `server/routes/admin-config.ts` | /api/admin/config/* | ❌ Phase 3 |
| C8 | `server/middleware/auth.ts` | JWT 验证 | ✅ Bearer Token 守卫 |
| C9 | `server/middleware/admin-guard.ts` | role=admin | ❌ Phase 3 |
| C10 | `server/middleware/rate-limit.ts` | 限流 | ✅ 登录 5/min + 生成 10/min |
| C11 | `server/middleware/cors.ts` | CORS | 🔵 已内联到 app.ts（不需要单独文件） |
| C12 | `server/db/repositories/*` | 4 个 repo | ✅ user/content/prompt/generation |
| C13 | `server/db/api-key-store.ts` | AES-256-GCM + Redis | ❌ Phase 3 |
| C14 | `server/admin/index.ts` | AdminJS 面板 | ❌ Phase 3 |
| C15 | `server/config.ts` | .env + config.json 合并 | ✅ Phase 0 |

---

### D. Workflow & Provider ✅ (Phase 1 出口达标)

| # | 文件 | 规格 | 状态 |
|---|---|---|---|
| D1 | `server/workflow/index.ts` | 7 节点 Pipeline 入口 | ✅ |
| D2 | `server/workflow/nodes/input.ts` | Input Node | ✅ |
| D3 | `server/workflow/nodes/prompt.ts` | Prompt Node | ✅ |
| D4 | `server/workflow/nodes/provider.ts` | Provider Node | ✅ |
| D5 | `server/workflow/nodes/parse.ts` | Parse Node | ✅ |
| D6 | `server/workflow/nodes/validate.ts` | Validate Node (OutputSchema) | ✅ |
| D7 | `server/workflow/nodes/dto.ts` | DTO Node | ✅ |
| D8 | `server/workflow/nodes/output.ts` | Output Node | ✅ |
| D9 | `server/providers/gemini-provider.ts` | Gemini 2.0 Flash | ✅ |
| D10 | `server/providers/deepseek-provider.ts` | DeepSeek V4 Flash | ✅ |
| D11 | `server/providers/siliconflow-provider.ts` | 硅基流动 Qwen2.5-72B | ❌ Phase 3 |
| D12 | `server/providers/tongyi-provider.ts` | 通义万相 2.0（图片） | ❌ Phase 3 |
| D13 | `server/providers/mock-provider.ts` | Mock 开发用 | ✅ |

---

### E. 前端页面 🔵 (旧骨架存在，需重构)

| # | 页面 | 路由 | 旧骨架 | 新需求 |
|---|---|---|---|---|
| E1 | HomePage | `/` | 🔵 含 MockProvider | ❌ 需改为 POST /api/generate |
| E2 | EditPage | `/edit/:id` | 🔵 含旧导出 | ❌ 需加配图按钮、发布记录、下载 |
| E3 | HistoryPage | `/history` | 🔵 | ⚠️ 需接后端 API |
| E4 | PromptPage | `/prompt` | 🔵 | ❌ 需完全重做（后端 CRUD） |
| E5 | LoginPage | `/login` | ❌ | ❌ 全新 |
| E6 | SettingsPage | `/settings` | ❌ | ❌ 全新 |
| E7 | DefaultLayout | — | 🔵 | ⚠️ 需加 Naive UI 组件 |

### F. 前端基础设施 ❌

| # | 项 | 状态 | 说明 |
|---|---|---|---|
| F1 | Naive UI 集成 | ❌ | `pnpm add naive-ui` |
| F2 | `src/stores/auth.ts` | ❌ | JWT 管理 + 路由守卫 |
| F3 | `src/utils/api-client.ts` | ❌ | fetch 封装（Authorization头/401刷新） |
| F4 | `src/repositories/http-repository.ts` | ❌ | HttpRepository<T> 实现 |
| F5 | `src/types/index.ts` | 🔵 | 旧类型存在，需对齐 docs/types.md |
| F6 | `src/constants/index.ts` | 🔵 | DEFAULT_MODEL='GPT-5.5' 需更新 |
| F7 | 前端 Logger | ❌ | loglevel 封装 |

---

### G. 工程 & 测试 ❌

| # | 项 | 状态 |
|---|---|---|
| G1 | Vitest 安装配置 | ❌ |
| G2 | 单元测试（纯函数） | ❌ |
| G3 | E2E 测试 | ❌ |
| G4 | swagger-jsdoc + scalar 集成 | ❌ |
| G5 | Vercel 部署配置 (vercel.json) | ❌ |
| G6 | GitHub Pages 部署配置 | ❌ |
| G7 | .env 模板文件 | ❌ |

---

## 三、项目推进流程设计

### 3.1 总体原则

1. **Phase 制推进** — 每个 Phase 有明确的入口条件、交付物、出口标准
2. **硬指标锁死** — 出口由 `scripts/phase-gate.sh` 脚本强制执行，不是口头约定
3. **进下一 Phase 唯一入口** — `pnpm phase:advance`。脚本会跑完全部检查，❌ 任何一项就不让进
4. **保护模型** — 客户端是早期反馈，服务端是真正保证：

```
你写代码
   │
   ▼
git commit ──→ pre-commit ⚠️ 警告（不阻断，让你知道还有 ❌）
   │
   ▼
git push ──→ pre-push 🚫 阻断（缺 phase tag 就拒绝）
   │
   │ 如果有人 git push --no-verify 跳过客户端 ...
   │
   ▼
GitHub Actions 🚫 阻断（服务端，跳不过）
   │
   ▼
main 分支保护：Require PR + Require CI pass → 真正锁死
```

**关键设置（必须手动去 GitHub 配一次）：**
Settings → Branches → Add rule → `main`
- ☑ Require a pull request before merging
- ☑ Require status checks to pass (`phase-gate`)

配完这一条之后，任何代码要进 main 必须先过 CI Phase 检查。客户端绕过无效。**这才是 100%。**

5. **文档先行** — 每个 Phase 开始前，检查对应文档是否覆盖所有需求
6. **可验证交付** — 每个 Milestone 必须有可运行的验证手段（curl / 浏览器 / 测试）

#### 硬指标工具

```bash
pnpm phase:status   # 查看当前 Phase + 出口检查摘要
pnpm phase:check    # 跑当前 Phase 出口全套检查
pnpm phase:advance  # 全部 ✅ → 写 .phase + git tag → 进入下一 Phase
```

- `.phase` 文件记录当前 Phase（纯数字）。pre-commit 检测手动篡改并警告
- `scripts/phase-gate.sh` — 全部出口检查逻辑
- `scripts/pre-commit-hook.sh` — git commit 时的软警告
- `scripts/pre-push-hook.sh` — git push 时的硬阻断
- `.github/workflows/phase-gate.yml` — CI 服务端验证，防 `--no-verify` 绕过
- `pnpm install` 时自动安装两个 hooks 到 `.git/hooks/`

### 3.2 Phase 划分

```
Phase 0: 基础设施（DB + 后端骨架）
    │
    ▼ 出口：Express 启动成功 + DB 连接成功 + 8 张表创建
Phase 1: 后端核心（Auth + Workflow + Provider + API）
    │
    ▼ 出口：curl POST /api/generate 返回 Content DTO
Phase 2: 前端重构（Naive UI + 认证 + 生成 + 编辑）
    │
    ▼ 出口：浏览器输入主题 → 生成 → 编辑 → 导出，全流程可用
Phase 3: 管理与增强（AdminJS + Settings + 图片 + 发布）
    │
    ▼ 出口：完整 MVP，可部署到 Vercel + GitHub Pages
Phase 4: 测试与发布（E2E + 部署 + 文档收尾）
    │
    ▼ 出口：所有测试通过 + 线上可访问
```

### 3.3 Phase 详细拆解

#### Phase 0 — 基础设施

| # | 任务 | 产出 | 验证 |
|---|---|---|---|
| 0.1 | 初始化 `server/` 目录结构 | package.json / tsconfig | `tsc --noEmit` 通过 |
| 0.2 | `server/db/client.ts` — mysql2 连接池 | 连接池创建函数 | `node -e` 测试连接 |
| 0.3 | `server/db/schema.ts` — 8 张表 SQL | 建表语句 | MySQL 中执行 `SHOW TABLES` |
| 0.4 | `server/app.ts` — Express 骨架 + helmet + cors | Express 启动 | `curl localhost:3001/health` |
| 0.5 | `.env` 模板 + `server/config.ts` | 环境变量加载 | 日志输出 DB_HOST 等 |
| 0.6 | `server/utils/logger.ts` — winston | Logger 实例 | 日志文件写入 + console 输出 |

**出口标准**：Express 监听端口 + `GET /health` 返回 `{ status: 'ok', db: 'connected' }`

#### Phase 1 — 后端核心

| 里程碑 | 任务 | 验证 |
|---|---|---|
| **M1.1 Auth** | User Entity + 注册/登录/刷新/me/重置密码 | `curl POST /api/auth/register` → token |
| **M1.2 Repositories** | content-repo / prompt-repo / generation-repo / user-repo | 单元测试 CRUD |
| **M1.3 Providers** | 4 个 Provider + registerProvider | 单元测试 mock 调用 |
| **M1.4 Workflow** | 7 节点 Pipeline | `curl POST /api/generate` → Content DTO |
| **M1.5 API** | 对接所有前端路由 | Insomnia/Postman 全路由测试 |

**出口标准**：`POST /api/generate { topic: "春日穿搭", platform: "xiaohongshu" }` → 返回完整 Content DTO JSON

#### Phase 2 — 前端重构

| 里程碑 | 任务 | 验证 |
|---|---|---|
| **M2.1 基础设施** | Naive UI 安装 + api-client + http-repository + auth store | import 成功 |
| **M2.2 LoginPage** | 登录/注册表单 + 路由守卫 | 未登录 → 跳转 /login |
| **M2.3 HomePage** | 主题输入 + 平台选择 + Provider选择 + 生成 | 输入主题 → loading → 结果展示 |
| **M2.4 EditPage** | 标题/正文/标签编辑 + Markdown/JSON 导出 + 下载 | 编辑 → 导出 → 下载文件 |
| **M2.5 PromptPage** | 模板 CRUD + 版本列表 + 设置为默认 | 新建模板 → 编辑 → 新版本 V2 |
| **M2.6 HistoryPage** | 历史列表 + 分页 | 列表渲染 + 点击查看 |

**出口标准**：浏览器全流程走通（注册 → 登录 → 生成 → 编辑 → 导出）

#### Phase 3 — 管理与增强

| 里程碑 | 任务 | 验证 |
|---|---|---|
| **M3.1 SettingsPage** | DB配置 / API Key / 平台账单链接 | 改DB配置 → 测试连接 |
| **M3.2 AdminJS** | 数据库管理面板 /admin | 浏览器访问 /admin |
| **M3.3 图片生成** | 通义万相接入 + 编辑页配图按钮 | 点击生成配图 → 图片URL展示 |
| **M3.4 发布记录** | 编辑页标记已发布 + 历史记录 | 标记发布 → 记录显示 |
| **M3.5 上下文溢出** | token估算 + 压缩 + 用户弹窗 | 超长对话 → 溢出提示弹窗 |

**出口标准**：前端 GitHub Pages + 后端 Vercel 均可访问，所有 MVP 功能可用

#### Phase 4 — 测试与发布

| 任务 | 验证 |
|---|---|
| Vitest 单元测试（纯函数覆盖） | `pnpm test` 全部通过 |
| E2E 测试（关键路径） | 生成流程 E2E 通过 |
| swagger-jsdoc + scalar 集成 | `/api-docs` 可访问 |
| Vercel 部署配置 | `vercel --prod` 成功 |
| GitHub Pages 部署 | Actions 部署成功 |
| PROGRESS.md 最终更新 | 全部 ✅ |

---

### 3.4 变更控制规则

在推进过程中，如果需要偏离原定设计：

| 场景 | 处理 |
|---|---|
| **需求变更** | 先更新 PRD.md，再更新对应 SPEC / rules，再改代码 |
| **实现发现设计问题** | 暂停编码 → 更新文档并注明原因 → 继续编码 |
| **遇到阻塞**（如第三方库不兼容） | 记录到 Phase Notes，提出替代方案，等 review 后再改 |
| **Phase 出口未达标** | 不得进入下一个 Phase。必须修到通过为止 |

### 3.5 维护规则

- 每完成一个 Milestone，更新本文件对应条目的状态
- 每完成一个 Phase，在 GitHub 打 tag（如 `phase-0-done`）
- 每发现一个 bug 或缺口，在 `# Gaps & Bugs` 区域记录，不阻塞当前 Phase
- `PROGRESS.md` 是项目唯一真实状态来源，不允许"代码改了但 PROGRESS 没说"

---

## 四、Gaps & Bugs

> 发现缺口/bug 时在此记录。不影响当前 Phase 的问题可以先记下来，Phase 结束时 triage。

| # | 日期 | 描述 | 优先级 | 状态 |
|---|---|---|---|---|
| — | — | 暂无 | — | — |

---

## 五、当前 Phase：Phase 2 — 前端重构

**目标**：Naive UI + 认证对接 + 生成流程 + 编辑/导出

### Phase 0 回顾（✅ 已完成）

| # | 任务 | 状态 | 备注 |
|---|---|---|---|
| 0.1 | 初始化 `server/` 目录结构 | ✅ | package.json / tsconfig.json 就位，依赖已安装 |
| 0.2 | `server/db/client.ts` | ✅ | mysql2 连接池 + TiDB Cloud SSL |
| 0.3 | `server/db/schema.ts` | ✅ | 8 张表 CREATE TABLE IF NOT EXISTS |
| 0.4 | `server/app.ts` + `server/index.ts` | ✅ | Express + helmet + cors + GET /health |
| 0.5 | `.env` 模板 + `server/config.ts` | ✅ | env.ts 显式路径 + 双层配置合并 |
| 0.6 | `server/utils/logger.ts` | ✅ | winston + createLogger |
| — | `server/db/check.ts` | ✅ | 独立 DB 连接测试脚本（供 phase gate 使用） |
| — | `server/env.ts` | ✅ | dotenv 显式路径加载，解决 ESM import hoisting |

**出口标准**：✅ Express 监听端口 + `GET /health` 返回 `{ status: 'ok', db: 'connected' }`

### Phase 1 回顾（✅ 已完成，21/21 通过）

| # | 任务 | 状态 | 备注 |
|---|---|---|---|
| 1.1 | JWT 认证系统 | ✅ | `routes/auth.ts` — 注册/登录/me/刷新 四个端点 |
| 1.2 | 认证中间件 | ✅ | `middleware/auth.ts` — Bearer Token 守卫 |
| 1.3 | 限流中间件 | ✅ | `middleware/rate-limit.ts` — 登录 5/min/IP + 生成 10/min/用户 |
| 1.4 | User Repository | ✅ | `db/repositories/user-repo.ts` |
| 1.5 | Content Repository | ✅ | `db/repositories/content-repo.ts` |
| 1.6 | Prompt Repository | ✅ | `db/repositories/prompt-repo.ts` |
| 1.7 | Generation Repository | ✅ | `db/repositories/generation-repo.ts` |
| 1.8 | Provider 注册中心 | ✅ | `providers/index.ts` — registerProvider/getProvider/listProviders |
| 1.9 | Mock Provider | ✅ | `providers/mock-provider.ts` — 开发用假数据 |
| 1.10 | Gemini Provider | ✅ | `providers/gemini-provider.ts` — @google/genai SDK |
| 1.11 | DeepSeek Provider | ✅ | `providers/deepseek-provider.ts` — OpenAI 兼容 |
| 1.12 | Workflow 7 节点 | ✅ | input/prompt/provider/parse/validate/dto/output |
| 1.13 | Workflow 引擎 | ✅ | `workflow/index.ts` — 含 Validate 失败 3 次重试 |
| 1.14 | Generate 路由 | ✅ | `routes/generate.ts` — POST /api/generate + 认证 + 限流 + 存入 DB |
| 1.15 | 类型定义 | ✅ | `server/types.ts` — WorkflowContext/Content/AIProvider 等全部类型 |

**出口标准**：✅ `POST /api/generate { "topic":"test", "platform":"xiaohongshu", "provider":"mock" }` → 200 + Content DTO

### Phase 1 延期项（已明确分配后续 Phase）

| 文件 | 目标 Phase | 原因 |
|------|----------|------|
| `routes/content.ts` | Phase 2 | 前端编辑页 CRUD 需要 |
| `routes/prompt.ts` | Phase 2 | Prompt 管理页需要 |
| `routes/admin-config.ts` | Phase 3 | Settings + AdminJS |
| `middleware/admin-guard.ts` | Phase 3 | Admin 面板需要 |
| `db/api-key-store.ts` | Phase 3 | API Key 加密存储 |
| `admin/index.ts` | Phase 3 | AdminJS 面板 |
| `siliconflow-provider.ts` | Phase 3 | 低优先级 Provider |
| `tongyi-provider.ts` | Phase 3 | 图片生成（配图功能） |

### Phase 2 任务清单

| # | 任务 | 产出 | 验证 |
|---|---|---|---|
| 2.1 | Naive UI 安装 + 集成 | `pnpm add naive-ui`，全局注册 | import 成功 |
| 2.2 | `src/utils/api-client.ts` | fetch 封装（Authorization 头/401 刷新） | token 自动携带 |
| 2.3 | `src/stores/auth.ts` | JWT 管理 + 路由守卫 | 未登录 → 跳转 /login |
| 2.4 | `src/repositories/http-repository.ts` | HttpRepository<T> 实现 | 对接后端 REST |
| 2.5 | LoginPage | 登录/注册表单 | 注册 → 登录 → 进首页 |
| 2.6 | HomePage | 主题输入 + 平台/Provider 选择 + 生成 | 输入主题 → loading → 结果 |
| 2.7 | EditPage | 编辑 + 导出（Markdown/JSON）+ 下载 | 编辑 → 导出 → 下载文件 |
| 2.8 | `routes/content.ts` | 后端 /api/content/* CRUD | curl 全路由测试 |
| 2.9 | `routes/prompt.ts` | 后端 /api/prompt/* CRUD | curl 全路由测试 |
| 2.10 | PromptPage | 模板 CRUD + 版本列表 | 新建 → 编辑 → V2 |
| 2.11 | HistoryPage | 历史列表 + 分页 | 列表渲染 + 点击查看 |

**出口标准**：浏览器全流程走通（注册 → 登录 → 生成 → 编辑 → 导出）
