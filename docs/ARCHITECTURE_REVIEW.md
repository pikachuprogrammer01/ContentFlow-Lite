# 后端架构验收报告

> 验收日期：2026-07-05
> 验收范围：`server/` 目录结构、分层职责、架构文档一致性
> 参照标准：`docs/SPEC.md`、`docs/PRD.md`、`CLAUDE.md`

---

## 一、目录结构现状

```
server/
├── app.ts                          # Express 应用装配
├── config.ts                       # .env + config.json 双层配置
├── env.ts                          # dotenv 引导（必须最先加载）
├── index.ts                        # 入口：加载 env → 初始化 DB → 创建表 → 启动服务
├── types.ts                        # 类型重导出（@contentflow/shared 桥接 + 后端专有类型）
├── db/                             # 数据库层
│   ├── check.ts                    # 独立连接测试（phase-gate 脚本用）
│   ├── client.ts                   # mysql2/promise 连接池（getPool / closePool / testConnection）
│   ├── schema.ts                   # 8 张表 DDL（CREATE TABLE 语句数组）
│   └── repositories/               # 数据仓库
│       ├── content-repo.ts         # contents CRUD
│       ├── generation-repo.ts      # generation_records CRUD
│       ├── prompt-repo.ts          # prompt_templates + prompt_versions CRUD
│       └── user-repo.ts            # users CRUD
├── middleware/                      # 中间件
│   ├── auth.ts                     # JWT 验证 + adminGuard / superAdminGuard
│   └── rate-limit.ts               # 限流器（登录/生成/重置密码三个限流实例）
├── providers/                       # AI Provider 层
│   ├── index.ts                    # Provider 注册表（Map<string, AIProvider>）
│   ├── deepseek-provider.ts        # DeepSeek V4 Flash
│   ├── gemini-provider.ts          # Gemini 2.0 Flash
│   └── mock-provider.ts            # Mock 测试用 Provider
├── routes/                          # Express 路由
│   ├── admin.ts                    # ⚠️ 存疑 — 仅一行 re-export 到 admin/index.ts
│   ├── auth.ts                     # /api/auth/* 注册/登录/个人信息
│   ├── content.ts                  # /api/content/* 内容 CRUD
│   ├── generate.ts                 # /api/generate 触发 Workflow
│   ├── prompt.ts                   # /api/prompt/templates + versions
│   └── admin/                      # 管理面板子路由
│       ├── index.ts                # 路由聚合器（authMiddleware + adminGuard）
│       ├── contents.ts             # 内容管理
│       ├── generations.ts          # 生成记录管理
│       ├── prompts.ts              # Prompt 模板/版本管理
│       └── users.ts                # 用户管理
├── scripts/                         # 运维脚本
│   ├── migrate-role-enum.ts        # ALTER TABLE role ENUM 迁移
│   ├── promote-admin.ts            # 提升用户角色
│   └── reset-super-admin.ts        # 删除所有 super_admin
├── utils/                           # 工具函数
│   ├── logger.ts                   # Winston 5 级日志 + DB Transport
│   ├── route-helpers.ts            # 分页解析（parsePagination / wrapPagination）+ 批量校验（validateBatchIds）
│   ├── response.ts                 # 统一响应信封（success / created / fail）
│   ├── errors.ts                   # AppError 类族（7 子类 + ErrorCode 常量）
│   └── validate.ts                 # 输入校验（用户名/邮箱/密码）
├── workflow/                        # 工作流引擎
│   ├── index.ts                    # executeWorkflow() — 7 节点 Pipeline + ≤3 次重试
│   └── nodes/                      # 工作流节点
│       ├── input.ts                # 参数校验 + 默认值
│       ├── prompt.ts               # 构建 FinalPrompt
│       ├── provider.ts             # 调用 AI（≤3 次重试）
│       ├── parse.ts                # JSON 解析 → Content 对象
│       ├── validate.ts             # OutputSchema 校验
│       ├── dto.ts                  # 注入 ID + Metadata
│       └── output.ts               # 最终透传
└── dist/                            # 编译产物
```

---

## 二、目录职责定义（应与实际对照）

### 框架推荐目录（Express 惯例）

| 目录 | 应放入 | 禁止放入 |
|------|--------|---------|
| `middleware/` | 请求拦截/认证/限流/日志中间件 | 业务逻辑、数据库操作 |
| `routes/` | Express Router 定义、参数校验、响应格式化 | 业务逻辑、数据库操作（必须走 Repository） |
| `providers/` | AI Provider 接口实现、Provider 注册 | 业务逻辑、路由逻辑、数据库操作 |

### 项目自定义目录（ContentFlow 特有）

| 目录 | 应放入 | 禁止放入 |
|------|--------|---------|
| `workflow/` | Workflow 引擎 + 7 节点实现 | 路由逻辑、数据库操作（只调 Repository 接口） |
| `db/repositories/` | 数据仓库（CRUD 封装、行→DTO 转换） | 业务逻辑、路由逻辑 |
| `db/`（根） | 连接池、Schema、连接测试 | 业务逻辑 |
| `utils/` | 纯工具函数（日志/校验/分页辅助） | 业务逻辑、数据库操作、Provider 调用 |
| `scripts/` | 一次性运维脚本（迁移/重置） | 运行时业务代码 |

---

## 三、当前架构评分

### 3.1 ✅ 做得好的地方

| 项 | 评价 | 理由 |
|----|------|------|
| **目录职责** | 七大模块边界清晰：db / middleware / providers / routes / utils / workflow / scripts，职责单一 | 新人看目录名即知文件归属，不会把 Provider 写到 routes 里，不会把 SQL 写到 utils 里 |
| **分层执行** | 路由 → Workflow → Provider → Repository 链路完整，路由不含业务逻辑 ✅ | 修改 AI 调用逻辑只需动 Provider，修改业务编排只需动 Workflow，路由层不受影响 |
| **Repository 模式** | 4 个 Repository 统一封装 CRUD，路由不直接写 SQL ✅ | 未来换数据库（如 MySQL → PostgreSQL）只改 4 个文件，路由和 Workflow 零改动 |
| **Provider 注册表** | `providers/index.ts` 以 Map 管理 Provider，自注册模式，无硬编码 switch ✅ | 新增模型只需新建一个文件 + import，不需要改 Workflow、路由或其他 Provider |
| **Workflow 节点化** | 7 个 Node 独立文件，串行执行 + 重试机制，既隔离又可组合 ✅ | 单独测试每个节点、替换单个节点（如换 Parser 实现）不影响其他 6 个节点 |
| **admin 子路由** | `routes/admin/` 按模块拆分为 5 个子文件 + index.ts 聚合，比单文件清晰 ✅ | 用户管理出 bug 只需看 users.ts，不会被其他 500 行代码干扰 |
| **utils 纯函数** | validate / logger / route-helpers 均为纯工具函数，不混入业务 ✅ | 工具函数可在任何层复用，不会因为 import 了 utils 而意外引入数据库依赖 |
| **scripts 隔离** | 运维脚本独立目录，不混入运行时代码 ✅ | 生产和运维职责分离——生产代码 crash 不会是因为运维脚本被误 import 执行 |
| **类型桥接** | `server/types.ts` 统一重导出 `@contentflow/shared`，避免重复定义 ✅ | Content DTO 只在一处定义，前后端类型不一致的 bug 从根本上消灭 |
| **配置封装** | `config.ts` 单文件负责 .env + config.json 双层读取，不散落 `process.env` ✅ | 配置变更（如换配置源为 Redis）只需改一个文件；测试时可 mock 配置而非污染环境变量 |

### 3.2 ⚠️ 需改进的地方

| 级别 | # | 位置 | 问题 | 理由 | 建议 |
|------|---|------|------|------|------|
| 🔴 | 1 | `routes/admin.ts` | 仅一行 re-export — 无实际价值 | 多一层间接引用，不增加任何抽象价值，反而让新人困惑"到底改哪个文件" | **删除**，`app.ts` 直接引用 `routes/admin/index.js` |
| 🟡 | 2 | `middleware/auth.ts` | 包含 `adminGuard` + `superAdminGuard`，三种职责混在一个文件 | 认证（who you are）和授权（what you can do）是两个独立关注点。混在一起导致：测试认证逻辑时被迫加载授权代码、新增 Guard 时 auth.ts 不断膨胀 | 拆分为 `middleware/admin-guard.ts`，`auth.ts` 只保留 `authMiddleware` |
| 🟡 | 3 | `providers/` 缺失 | 规范中列出 SiliconFlow + 通义万相两个 Provider，均未实现 | 用户手册上说支持但代码里没有，属于文档与实现不一致。且自注册模式已经搭好——新增 Provider 成本极低，应趁早补齐以免积累更多 | Phase 3 补全 |
| 🟡 | 4 | 无 API Key 加密存储 | API Key 直接读 `process.env`，未做 AES-256-GCM 加密 | 当前 `.env` 文件里 API Key 明文存储，任何有服务器文件读取权限的人都能看到全部 Key。规范要求加密是因为一旦服务器被攻破，明文 Key 可被直接用于调用付费 API | Phase 3 用 TypeORM Entity + crypto 封装 |
| 🟡 | 5 | 无 Redis 缓存层 | 架构设计支持 Redis 可选缓存，当前完全未实现 | 每次请求都查数据库拿权限/配置，高并发时数据库成为瓶颈。Redis 不是功能需求而是性能需求——当前流量小不受影响，但架构不预留缓存切换点则后期改造成本高 | Phase 3 实现 Redis/内存双模缓存，无 Redis 时静默降级 |
| 🟢 | 6 | 无 `/api/log` 端点 | 前端错误上报到 `app_logs` 表的 API 不存在 | 前端 Winston DB Transport 需要后端接收日志的 API。当前前端错误只输出到浏览器控制台——用户离开页面后错误信息丢失，无法做问题追溯 | Phase 3 补全 |


### 3.3 架构文档与实际差异

| 文档描述 | 实际实现 | 差异评估 | 理由 |
|---------|---------|---------|------|
| TypeORM（必须） | mysql2/promise 手写 SQL | 🔴 架构重大偏离 — Phase 3 迁移 | 手写 SQL 存在注入风险（prompt-repo.ts Object.entries 拼接）、无类型安全、AdminJS 无法直接对接。这是 Phase 3 最高优先级工作 |
| AdminJS `/admin` | 自建 Vue 管理面板 + REST API | 🔴 架构偏离 — Phase 3 用 AdminJS 替代 | 自建面板每加一张表就要手写 CRUD 页面和路由。AdminJS 只需定义 Resource + 字段属性即可自动生成 UI，维护成本差一个数量级 |
| AES-256-GCM API Key 加密 | 直接读 `process.env` | 🟡 安全欠账 — Phase 3 处理 | 规范要求加密是因为 `.env` 文件和生产环境变量在服务器被攻破后是第一批被读取的文件。明文 Key 的损失不可逆——攻击者直接调用付费 API |
| Redis 可选缓存 | 无 | 🟢 设计上就是可选 | 规范原文就是"Redis 可选"——未连接时不报错、不影响功能。当前流量下内存缓存足够，无需立即处理 |
| role ENUM('admin','user') | ENUM('super_admin','admin','user') | 🟡 当前临时方案，PROGRESS Phase 3 设计更优 | 当前 ENUM 三值是 Phase 2 的过渡方案，无法支持自定义角色、用户多角色、数据范围。PROGRESS Phase 3 已设计完整的 RBAC 体系：`roles` 实体表（含 level 层级）+ `user_roles` 多对多 + `role_permissions` 挂 `data_scope`（ALL/SELF）+ `user_permissions` 用户级覆盖（GRANT/DENY）。届时 ENUM 将被废弃，users.role 列迁移为 user_roles 关联 |
| access token 15min + refresh 7d | 单 Token 24h | 🟢 简化合理，MVP 足够 | 双 Token 机制需要额外实现 refresh 端点 + 前端自动刷新逻辑。MVP 阶段用户量少、安全威胁面小，24h 单 Token 的复杂度收益比最优。Phase 3 权限系统上线后，引入 refresh token 以支持实时权限撤销 |
| 10 个 Entity | 4 个 Repository 手写 | 🔴 Phase 3 TypeORM 后解决 | 手写 repo 每增删字段要改 SQL 字符串、行映射函数、类型定义三处。Entity 只需改一处——装饰器标记的类属性即类型即映射 |

---

## 四、目录责任总览（一页明）

```
server/
│
├── app.ts            → Express 胶水层：中间件注册 + 路由挂载
├── index.ts          → 启动入口：按序启动各组件，做启动前检查
├── config.ts         → 配置门面：.env + config.json 唯一读取入口
├── env.ts            → dotenv 引导：最早加载，保证 process.env 就绪
├── types.ts          → 类型桥：@contentflow/shared 重导出 + 后端专有类型
│
├── db/               → 数据层（Infrastructure）
│   ├── client.ts         ← 连接池（唯一 DB 连接入口）
│   ├── schema.ts         ← DDL（建表脚本，需与 mysql2 / TypeORM 保持同步）
│   ├── check.ts          ← 运维工具（不属于运行时）
│   └── repositories/     ← CRUD 封装（路由/Workflow 只能调这里）
│       ├── user-repo.ts
│       ├── content-repo.ts
│       ├── prompt-repo.ts
│       └── generation-repo.ts
│
├── middleware/        → 请求管道（HTTP Layer）
│   ├── auth.ts           ← JWT 验证 + 角色 Guard
│   ├── rate-limit.ts     ← 限流策略
│   ├── cors.ts           ← CORS 跨域配置
│   └── error-handler.ts  ← 全局异常处理 + asyncHandler（统一 throw → fail()）
│
├── routes/           → 路由层（HTTP Layer）
│   ├── auth.ts           ← 注册/登录/个人信息
│   ├── content.ts        ← 内容 CRUD
│   ├── generate.ts       ← 参数校验 → 调 Workflow → Repository 保存 + 记录生成 → 错误码映射 → 响应
│   ├── prompt.ts         ← 模板/版本 CRUD
│   └── admin/            ← 管理面板（Phase 3 由 AdminJS 替代）
│       ├── index.ts      ← 聚合 + 权限守卫
│       ├── users.ts
│       ├── contents.ts
│       ├── generations.ts
│       └── prompts.ts
│
├── providers/        → AI 接口层（Service Layer）
│   ├── index.ts          ← Provider 注册表
│   ├── gemini-provider.ts
│   ├── deepseek-provider.ts
│   └── mock-provider.ts
│
├── workflow/         → 业务引擎（Service Layer）— 系统唯一业务编排中心
│   ├── index.ts          ← Pipeline 调度：串行执行 7 节点，Validate 失败自动重试（≤3 次）
│   └── nodes/            ← 各节点不可单独调用，必须经 index.ts 编排
│       ├── input.ts      ← 校验必填字段（topic/platform/provider），补全默认值
│       ├── prompt.ts     ← 查询用户默认模板 → 构建 FinalPrompt（systemPrompt + userPrompt）
│       ├── provider.ts   ← 从注册表取 Provider → 调 AI → 网络错误重试（≤3，指数退避）
│       ├── parse.ts      ← JSON.parse 原始响应 → 剥离 markdown 代码块 → Content 对象
│       ├── validate.ts   ← 对 Content 做 OutputSchema 校验 → 失败原因写入 WorkflowError
│       ├── dto.ts        ← 注入 id + createdAt + Metadata（promptId/version/model/platform）
│       └── output.ts     ← 最终透传：保证 ctx.output 非空后返回
│
├── utils/            → 工具层（零依赖业务）
│   ├── logger.ts         ← Winston 日志封装
│   ├── route-helpers.ts  ← 分页/批量/错误辅助
│   └── validate.ts       ← 输入校验函数
│
└── scripts/          → 运维层（一次性脚本，非运行时）
    ├── migrate-role-enum.ts
    ├── promote-admin.ts
    └── reset-super-admin.ts
```

**核心规则（一页）**：

| 层 | 允许 | 禁止 |
|----|------|------|
| `routes/` | 参数校验、调 Repository、调 Workflow、格式化响应 | 写 SQL、业务逻辑、调 Provider |
| `workflow/` | 调度节点、重试、调 Provider、调 Parser | 写 SQL、直接操作 req/res、调路由 |
| `providers/` | 调 AI SDK、返回原始文本 | 数据库操作、业务逻辑、解析内容 |
| `db/repositories/` | CRUD、行→DTO 转换 | 业务逻辑、调 Provider、调路由 |
| `middleware/` | 请求拦截、认证、限流 | 业务逻辑、数据库操作 |
| `utils/` | 纯函数工具 | 业务逻辑、调数据库、调 Provider |
| `scripts/` | 运维命令 | 作为运行时模块被 import |

---

## 五、改进建议（优先级排序）

### P0 — 立即处理（不改会产生混乱）

1. **删除 `routes/admin.ts` shim** — `app.ts` 直接引用 `routes/admin/index.ts`，消除无意义重导出
2. ~~创建 `.rules/` 目录~~ — 已确认存在，关闭此项

### P1 — Phase 3 执行时处理

3. **TypeORM 替换 mysql2** — 消除 SQL 注入风险，提供 Entity 类型安全
4. **AdminJS 替换自建面板** — `/admin` 由 AdminJS 接管，删 `routes/admin/` 全部手写路由
5. **API Key AES-256-GCM 加密** — 创建 `db/api-key-store.ts`，Provider 读加密后的 Key
6. **Redis + 内存双模缓存** — 用户选择 Redis 则用，不选静默内存缓存
7. **补全缺失 Provider** — SiliconFlow / 通义万相
8. **补全 `/api/log` 端点** — 前端错误上报

### P2 — 低优先级优化

9. ~~CORS 抽离~~ — 已完成，见 `middleware/cors.ts`
10. ~~全局异常处理中间件~~ — 已完成，见 `middleware/error-handler.ts` `utils/errors.ts` `utils/response.ts`
11. **adminGuard 拆分为独立文件** — `middleware/admin-guard.ts`
12. **`dist/` 目录清理** — 确认 `.gitignore` 排除编译产物

---

## 六、验收结论

| 维度 | 评分 | 说明 |
|------|:----:|------|
| 目录结构合理性 | ⭐⭐⭐⭐⭐ | 七大模块划分清晰，职责边界定义明确 |
| 分层执行一致性 | ⭐⭐⭐⭐☆ | 路由→Workflow→Provider→Repository 链路完整，偶有 shim 冗余 |
| 架构文档匹配度 | ⭐⭐⭐☆☆ | TypeORM/AdminJS 规划但未实施，已纳入 Phase 3 迁移计划 |
| 安全基线下限 | ⭐⭐⭐☆☆ | SQL 注入防护达标（参数化查询），API Key 未加密 |
| 扩展预留 | ⭐⭐⭐⭐☆ | Provider 注册表 + Workflow 节点 + Repository 接口均支持新增 |

**综合评定：架构基本健康，Phase 3 解决遗留债务后可达到生产级标准。**
