# ContentFlow Lite — 实现进度追踪

> 基于 `docs/SPEC.md` 和 `docs/PRD.md`，逐条对照实现状态。
> 状态：✅ 已完成 | 🔵 骨架可用 | ⚠️ 部分实现 | ❌ 未开始

---

## 1. 数据模型层（Content DTO & Domain）

| # | 需求 | 规格来源 | 文件 | 状态 |
|---|---|---|---|---|
| 1.1 | `Content` DTO — 统一内容数据结构 | SPEC §7 | `src/types/index.ts:38-48` | ✅ |
| 1.2 | `Title` / `Cover` / `Page` / `Metadata` 子类型 | SPEC §7.1-7.5 | `src/types/index.ts:12-48` | ✅ |
| 1.3 | `PromptTemplate` 类型 | SPEC §9.1 | `src/types/index.ts:54-60` | ✅ |
| 1.4 | `PromptVersion` 类型（不可变） | SPEC §9.2 | `src/types/index.ts:62-68` | ✅ |
| 1.5 | `PromptVariables` / `FinalPrompt` 类型 | SPEC §9.3 | `src/types/index.ts:76-88` | ✅ |
| 1.6 | `WorkflowContext` / `WorkflowInput` / `WorkflowResult` | SPEC §8.3-8.4 | `src/types/index.ts:102-125` | ✅ |
| 1.7 | `AppError` / `WorkflowError` 统一错误对象 | SPEC §13.1 | `src/types/index.ts:141-154` | ✅ |
| 1.8 | `AIProvider` 接口 | SPEC §10.1 | `src/types/index.ts:160-164` | ✅ |
| 1.9 | `Repository<T>` 接口 | SPEC §6.1 | `src/types/index.ts:170-175` | ✅ |
| 1.10 | `Exporter` 接口 + `ExportFormat` | SPEC §11.1 | `src/types/index.ts:181-186` | ✅ |
| 1.11 | `GenerationRecord`（记录每次生成上下文） | SPEC §5.7 | `src/types/index.ts:192-201` | ✅ |
| 1.12 | DTO 工厂函数（`createContent`/`createPage` 等） | SPEC §7.6 | `src/models/index.ts` | ✅ |

---

## 2. Workflow Engine

| # | 需求 | 规格来源 | 文件 | 状态 |
|---|---|---|---|---|
| 2.1 | 六节点 Pipeline（input→prompt→provider→parse→dto→output） | SPEC §8.2 | `src/workflow/engine/index.ts` | ✅ |
| 2.2 | Input Node — 参数校验（topic/platform 非空） | SPEC §8.2 | `src/workflow/engine/index.ts:51-64` | ✅ |
| 2.3 | Prompt Node — 调用 PromptBuilder 构建 FinalPrompt | SPEC §8.2 | `src/workflow/engine/index.ts:67-69` | ✅ |
| 2.4 | Provider Node — 调用 AI（含 MAX_RETRY_COUNT 重试） | SPEC §8.2 | `src/workflow/engine/index.ts:72-97` | ✅ |
| 2.5 | Parse Node — 调用 Parser 转为 Content DTO | SPEC §8.2 | `src/workflow/engine/index.ts:100-108` | ✅ |
| 2.6 | DTO Node — Metadata 注入与最终校验 | SPEC §8.2 | `src/workflow/engine/index.ts:111-119` | ✅ |
| 2.7 | Output Node — 结果分发 | SPEC §8.2 | `src/workflow/engine/index.ts:122-124` | ✅ |
| 2.8 | 统一异常处理（所有异常由 Workflow 捕获） | SPEC §13 | `src/workflow/engine/index.ts:131-144` | ✅ |
| 2.9 | 节点耗时记录（`nodeTimings`） | SPEC §8.4 | `src/workflow/engine/index.ts:25-27` | ✅ |
| 2.10 | Workflow 保持无状态（Stateless） | SPEC §8.5 | `src/workflow/engine/index.ts:45-46` | ✅ |

---

## 3. Prompt 模块

| # | 需求 | 规格来源 | 文件 | 状态 |
|---|---|---|---|---|
| 3.1 | Prompt Builder — 唯一生成 Prompt 的模块 | SPEC §9.3 | `src/prompt/builder/index.ts` | ✅ |
| 3.2 | `buildFinalPrompt()` — Template + Variables → FinalPrompt | SPEC §9.3 | `src/prompt/builder/index.ts:18-39` | ✅ |
| 3.3 | `replaceVariables()` — `{{topic}}`/`{{platform}}` 等变量替换 | SPEC §9.3 | `src/prompt/builder/index.ts:45-54` | ✅ |
| 3.4 | 内置模板：小红书通用模板 | SPEC §14.2 | `src/prompt/template/index.ts:15-46` | ✅ |
| 3.5 | 内置模板：抖音通用模板 | SPEC §14.2 | `src/prompt/template/index.ts:48-79` | ✅ |
| 3.6 | `getDefaultTemplate(platform)` — 按平台获取模板 | — | `src/prompt/template/index.ts:85-95` | ✅ |
| 3.7 | `registerTemplate()` — 注册自定义模板（扩展性） | — | `src/prompt/template/index.ts:114-116` | ✅ |
| 3.8 | Prompt Version 不可覆盖机制 | SPEC §9.2 | `src/prompt/version/index.ts:72-82` | ✅ |
| 3.9 | `getPromptVersion(id, ver)` — 按 ID+版本号获取 | — | `src/prompt/version/index.ts:44-66` | ✅ |
| 3.10 | `listPromptVersions(id)` — 获取某 Prompt 所有版本 | — | `src/prompt/version/index.ts:87-96` | ✅ |
| 3.11 | `getLatestVersion(id)` — 获取最新版本 | — | `src/prompt/version/index.ts:102-104` | ✅ |
| 3.12 | 默认版本自动初始化（`ensureDefaultVersion`） | — | `src/prompt/version/index.ts:26-38` | ✅ |
| 3.13 | Prompt Version 持久化到 Repository | SPEC §9.4 | — | ❌ 当前在内存中 |

---

## 4. AI Provider

| # | 需求 | 规格来源 | 文件 | 状态 |
|---|---|---|---|---|
| 4.1 | `AIProvider` 抽象接口（`name`/`model`/`generate`） | SPEC §10.1 | `src/types/index.ts:160-164` | ✅ |
| 4.2 | `MockProvider` — Mock AI 响应（开发调试用） | — | `src/providers/index.ts:23-93` | ✅ |
| 4.3 | `registerProvider()` — 注册新 Provider | SPEC §14.1 | `src/providers/index.ts:98-100` | ✅ |
| 4.4 | `callProvider()` — 统一调用入口 | — | `src/providers/index.ts:115-118` | ✅ |
| 4.5 | OpenAI Provider（真实 API 接入） | SPEC §14.1 | — | ❌ |
| 4.6 | Claude Provider | SPEC §14.1 | — | ❌ |
| 4.7 | DeepSeek / Qwen / GLM Provider | SPEC §14.1 | — | ❌ |
| 4.8 | 多 Provider 切换 UI（配置面板） | — | — | ❌ |

---

## 5. Parser（解析器）

| # | 需求 | 规格来源 | 文件 | 状态 |
|---|---|---|---|---|
| 5.1 | `parseContent()` — Raw Response → Content DTO | SPEC §5.4 | `src/parser/index.ts:39-99` | ✅ |
| 5.2 | JSON 提取（处理 markdown code block 包裹） | — | `src/parser/index.ts:41-47` | ✅ |
| 5.3 | JSON 解析 + 异常捕获（code: PARSE_ERROR） | — | `src/parser/index.ts:50-57` | ✅ |
| 5.4 | 数据标准化 + 默认值填充（titles/cover/pages/tags） | — | `src/parser/index.ts:60-79` | ✅ |
| 5.5 | Metadata 自动注入（promptId/version/model/platform） | — | `src/parser/index.ts:82-87` | ✅ |
| 5.6 | 字段级校验（validator/normalizer 独立模块） | SPEC §5.4.1-5.4.2 | — | ❌ 当前在单文件内 |

---

## 6. Storage（数据持久化）

| # | 需求 | 规格来源 | 文件 | 状态 |
|---|---|---|---|---|
| 6.1 | `Repository<T>` 接口（save/get/list/delete） | SPEC §6.1 | `src/types/index.ts:170-175` | ✅ |
| 6.2 | `LocalStorageRepository<T>` 实现 | SPEC §6.2 | `src/repositories/index.ts:18-72` | ✅ |
| 6.3 | `createRepository()` 工厂函数 | — | `src/repositories/index.ts:77-82` | ✅ |
| 6.4 | 预置 Repository 实例（content/promptVersion/generation） | — | `src/repositories/index.ts:85-90` | ✅ |
| 6.5 | 业务层不直接操作 localStorage（通过 Repository） | SPEC §6.3 | Store 仅调用 `contentRepository` | ✅ |
| 6.6 | Prompt Version Repository（持久化版本） | — | — | ❌ 当前在内存 |
| 6.7 | IndexedDB 替代方案 | SPEC §14.5 | — | ❌ 远期 |

---

## 7. Exporter（导出模块）

| # | 需求 | 规格来源 | 文件 | 状态 |
|---|---|---|---|---|
| 7.1 | `Exporter` 接口（`format`/`export`） | SPEC §11.1 | `src/types/index.ts:183-186` | ✅ |
| 7.2 | `MarkdownExporter` — Markdown 格式导出 | SPEC §11.2 | `src/exporter/index.ts:16-93` | ✅ |
| 7.3 | `JsonExporter` — JSON 格式导出（含 Metadata） | SPEC §11.3 | `src/exporter/index.ts:98-104` | ✅ |
| 7.4 | 导出器注册表 + `getExporter(format)` | — | `src/exporter/index.ts:107-122` | ✅ |
| 7.5 | `exportContent(content, format)` — 统一导出入口 | — | `src/exporter/index.ts:127-130` | ✅ |
| 7.6 | HTML 导出 | SPEC §11 | — | ❌ |
| 7.7 | 一键复制全文 | PRD §6 | — | ❌ |

---

## 8. 页面层（UI）

| # | 需求 | 规格来源 | 文件 | 状态 |
|---|---|---|---|---|
| 8.1 | 首页 — 输入主题 / 选择平台 / 补充要求 / 生成按钮 | PRD §1 | `src/pages/HomePage.vue` | ✅ |
| 8.2 | 首页 — loading 态 / 错误态展示 | — | HomePage 含 loading/error 绑定 | ✅ |
| 8.3 | 编辑页 — 左侧内容 / 右侧编辑区 | PRD §5 | `src/pages/EditPage.vue` | ✅ |
| 8.4 | 编辑页 — 标题编辑 | PRD §5 | EditPage | ✅ |
| 8.5 | 编辑页 — 正文编辑 | PRD §5 | EditPage | ✅ |
| 8.6 | 编辑页 — 标签编辑（添加/删除） | PRD §5 | EditPage（addTag/removeTag） | ✅ |
| 8.7 | 编辑页 — 封面文案编辑 | PRD §5 | EditPage | ✅ |
| 8.8 | 编辑页 — 重新生成 | PRD §3 | EditPage（handleRegenerate） | ✅ |
| 8.9 | 编辑页 — 导出预览（Markdown/JSON 切换） | PRD §6 | EditPage（exportPreview） | ✅ |
| 8.10 | 编辑页 — 下载导出文件 | — | — | ❌ |
| 8.11 | 历史页 — 历史记录列表 | PRD §1.1 | `src/pages/HistoryPage.vue` | ✅ |
| 8.12 | 历史页 — 点击查看 / 删除 | — | HistoryPage | ✅ |
| 8.13 | Prompt 页 — 模板列表 | PRD §2 | `src/pages/PromptPage.vue` | ✅ |
| 8.14 | Prompt 页 — Version 查看 | PRD §2 | PromptPage（loadVersions） | ✅ |
| 8.15 | Prompt 页 — 新建 / 编辑 / 删除 Prompt | PRD §2 | — | ❌ |
| 8.16 | 页面层不调用 AI / 不拼接 Prompt / 不解析 JSON | SPEC §12 | 所有页面均符合 | ✅ |
| 8.17 | `DefaultLayout` 统一导航 | — | `src/layouts/DefaultLayout.vue` | ✅ |
| 8.18 | Vue Router 路由配置（4 条路由） | — | `src/router/index.ts` | ✅ |

---

## 9. Store（状态管理）

| # | 需求 | 规格来源 | 文件 | 状态 |
|---|---|---|---|---|
| 9.1 | `ContentStore` — 当前内容状态 | SPEC §12.1 | `src/stores/content.ts` | ✅ |
| 9.2 | `generate(input)` — 通过 Workflow 生成 | — | `content.ts:35-56` | ✅ |
| 9.3 | `updateContent(content)` — 编辑更新 | — | `content.ts:61-63` | ✅ |
| 9.4 | `regenerate()` — 重新生成 | — | `content.ts:68-77` | ✅ |
| 9.5 | `loadHistory()` / `deleteContent()` — 历史管理 | — | `content.ts:82-95` | ✅ |
| 9.6 | loading / error / empty 三态管理 | — | `content.ts:21-28` | ✅ |
| 9.7 | Store 不含业务逻辑（不调 AI/Parser/Storage） | SPEC §12.1 | ✅ |

---

## 10. 错误处理

| # | 需求 | 规格来源 | 文件 | 状态 |
|---|---|---|---|---|
| 10.1 | `AppError` 统一错误对象（code/module/message/detail） | SPEC §13.1 | `src/types/index.ts:141-146` | ✅ |
| 10.2 | `WorkflowError`（含 node + timestamp） | SPEC §13.1 | `src/types/index.ts:148-154` | ✅ |
| 10.3 | 7 种错误类型枚举（INPUT/PROMPT/PROVIDER/PARSE/DTO/STORAGE/EXPORT） | SPEC §13 | `src/types/index.ts:131-139` | ✅ |
| 10.4 | Workflow 统一异常捕获 | SPEC §13.2 | `src/workflow/engine/index.ts:131-144` | ✅ |
| 10.5 | Provider 重试机制（MAX_RETRY_COUNT） | SPEC §8.2 | `src/workflow/engine/index.ts:75-91` | ✅ |
| 10.6 | 页面统一错误展示 | — | HomePage 含 error box | ✅ |
| 10.7 | Logger 模块 | SPEC §2.1 | — | ❌ |
| 10.8 | 错误上下文保留 | SPEC §13.2 | ⚠️ 仅 detail 字段透传 |

---

## 11. 工程 & 规范

| # | 需求 | 规格来源 | 实现 | 状态 |
|---|---|---|---|---|
| 11.1 | pnpm 包管理 | — | `pnpm-lock.yaml` | ✅ |
| 11.2 | TypeScript 严格模式 | — | `tsconfig.app.json` | ✅ |
| 11.3 | Path alias `@/` → `src/` | — | `vite.config.ts` + `tsconfig.app.json` | ✅ |
| 11.4 | `.rules/` 架构/编码/Prompt/UI/Workflow 规范 | — | `.rules/` 6 个文件 | ✅ |
| 11.5 | `CLAUDE.md` AI 协作者执行原则 | — | `CLAUDE.md` | ✅ |
| 11.6 | MIT License | — | `LICENSE` | ✅ |
| 11.7 | 分层架构（5 层：UI/Workflow/Service/Domain/Infra） | SPEC §2.1 | 目录结构 | ✅ |
| 11.8 | 单向依赖（禁止循环/跨层/反向依赖） | SPEC §3 | 各模块 import 方向 | ✅ |
| 11.9 | Prompt Version 只增不覆盖 | SPEC §9.2 | `src/prompt/version/index.ts:72-82` | ✅ |
| 11.10 | Content DTO 唯一业务数据 | SPEC §7 | 全局引用 Content 类型 | ✅ |
| 11.11 | Workflow First — 唯一业务入口 | SPEC §8 | 所有页面通过 Store→Workflow | ✅ |

---

## 12. 待实现（按优先级排列）

### 🔴 P0 — MVP 必须

| # | 任务 | 说明 |
|---|---|---|
| P0-1 | 切换为真实 AI Provider | 将 MockProvider 替换为 OpenAI/Claude API 调用 |
| P0-2 | Prompt Version 持久化 | 从内存迁移到 `promptVersionRepository` |
| P0-3 | Prompt 管理页 CRUD | 新建/编辑/删除 Prompt，自动生成新 Version |
| P0-4 | 下载导出文件 | EditPage 增加下载按钮（Markdown/JSON 文件） |
| P0-5 | 一键复制全文 | EditPage 增加复制按钮 |

### 🟡 P1 — 体验提升

| # | 任务 | 说明 |
|---|---|---|
| P1-1 | 更多平台模板 | 公众号/知乎/B站/视频脚本 |
| P1-2 | Parser 拆分 | validator/normalizer/builder 独立子模块 |
| P1-3 | Logger 模块 | 统一日志，供调试用 |
| P1-4 | 平台选择 UI 增强 | 卡片式选择，显示模板预览 |
| P1-5 | 生成历史筛选 | 按平台/日期过滤历史记录 |

### 🔵 P2 — 远期扩展（见 PRD Roadmap）

| # | 任务 |
|---|---|
| P2-1 | 多模型切换（OpenAI/Claude/DeepSeek） |
| P2-2 | 图片生成（封面/插图） |
| P2-3 | 批量生成 |
| P2-4 | Prompt A/B Test |
| P2-5 | HTML/PDF 导出 |
| P2-6 | IndexedDB 存储迁移 |
| P2-7 | Workflow 可视化 |
| P2-8 | 云端同步 |

---

> 最后更新：初始化提交（commit `dfb37e5`）后。
> 运行 `pnpm dev` 启动 → MockProvider 可体验完整流程：输入主题 → 生成 → 编辑 → 导出。
