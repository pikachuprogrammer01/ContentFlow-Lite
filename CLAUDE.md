# ContentFlow Lite — 项目统筹

> 本文件是 AI 协作者的唯一入口。接到任务后先读本文件，根据任务类型找到对应文档，再动手。

---

## 一、系统本质

ContentFlow Lite 是 **Workflow 驱动的 AI 内容生成系统**。三要素：

| 要素 | 含义 | 不可变规则 |
|------|------|-----------|
| **Workflow** | 7 节点 Pipeline（Input→Prompt→Provider→Parse→Validate→DTO→Output） | 所有生成必须经过 Workflow，不可绕过 |
| **Content DTO** | 全系统唯一数据结构 | AI 输出必须转为 Content DTO，不存在第二套 |
| **Prompt Version** | 不可变版本快照 | 每次修改生成新版本，永不覆盖历史 |

技术栈：Vue 3 + Express 5 + MySQL 兼容 + pnpm monorepo（`client/` `server/` `shared/`）

---

## 二、任务路由

| 任务类型 | 先读 | 再读 | 然后 |
|---------|------|------|------|
| **开发新功能** | `docs/PRD.md`（需求） | `docs/SPEC.md`（架构） | 对应 `.rules/` + 编码 |
| **修改后端架构** | `docs/SPEC.md`（分层模型） | `docs/ARCHITECTURE_REVIEW.md`（目录职责） | `docs/FRAMEWORK_AUDIT.md`（封装边界） |
| **写/改 API** | `docs/API_SPEC.md`（接口规范） | `.rules/backend.mdc`（后端约束） | 写 JSDoc → 自动生成文档 |
| **写前端页面** | `.rules/ui.mdc` | `docs/types.md`（DTO 定义） | 只渲染 DTO，不写业务逻辑 |
| **改 Prompt** | `.rules/prompt.mdc` | `docs/types.md` §三（OutputSchema） | 永远新增版本 |
| **改数据库** | `.rules/backend.mdc` | `server/db/schema.ts`（8 表 DDL） | 通过 Repository，不裸写 SQL |
| **新增 AI 模型** | `.rules/provider.mdc` | `server/providers/index.ts`（注册表） | 新建文件 + 自注册，不改 Workflow |
| **改日志** | `.rules/logging.mdc` | `server/utils/logger.ts` | 禁止 console.log |
| **判断能否开始写业务** | — | `docs/IMPLEMENTATION_READINESS.md` | 20 项验收结果 |
| **推进 Phase** | `docs/PHASE_GATE.md` | `docs/PROGRESS.md`（当前状态） | `pnpm phase:advance` 唯一入口 |

---

## 三、核心约束（不可协商）

### 分层边界

| 层 | 允许 | 禁止 |
|----|------|------|
| `client/src/pages/` | 渲染 DTO、用户交互 | 业务逻辑、直接调 AI |
| `client/src/stores/` | 状态管理、调 `api-client.ts` | 直接 fetch/axios |
| `server/routes/` | 参数校验、调 Workflow/Repository、响应格式化 | 业务逻辑、写 SQL、调 Provider |
| `server/workflow/` | 7 节点编排、调 Provider、调 Parser | 写 SQL、操作 req/res |
| `server/providers/` | 调 AI SDK、返回原始文本 | 数据库操作、解析内容 |
| `server/db/repositories/` | CRUD、行→DTO 转换 | 业务逻辑、调 Provider |
| `server/utils/` | 纯函数工具 | 业务逻辑、数据库操作 |

### 绝对禁止

1. 绕过 Workflow 直接调 AI Provider
2. 在路由/Workflow 中写裸 SQL（必须走 Repository）
3. 覆盖已有 Prompt Version（必须新建版本）
4. 使用 `console.log`（必须用 `createLogger`）
5. 裸读 `process.env`（必须通过 `config.ts`）
6. 裸调 `mysql2.createConnection`（必须通过 `getPool()`）
7. 前端含业务逻辑（如 if/else 判断平台差异）
8. 手动改 `.phase` 文件
9. `git push --no-verify`

---

## 四、文档地图

| 场景 | 看什么 | 一句话描述 |
|------|--------|-----------|
| 新人上手 | `README.md` | 项目 landing page，5 分钟了解全貌 |
| 理解需求 | `docs/PRD.md` | 产品要做什么，用户是谁，MVP 边界 |
| 理解架构 | `docs/SPEC.md` | 六层架构、模块职责、Workflow 链路 |
| 理解为什么这样设计 | `docs/ADR.md` | 5 个关键架构决策的记录 |
| 查 API | `docs/API_SPEC.md` | 50 个接口的请求/响应规范 + 通用信封格式 |
| 写 API 测试 | `docs/API_TEST.md` | 23 个未测接口的 Apifox 用例模板 |
| 写 TypeScript | `docs/types.md` | 所有 DTO/接口/类型的唯一定义源 |
| 看进度 | `docs/PROGRESS.md` | 8 模块 × 3 Phase 实现状态 |
| 推进流程 | `docs/PHASE_GATE.md` | `pnpm phase:advance` 机制详解 |
| Phase 3 计划 | `docs/PHASE3_DESIGN.md` | RBAC·TypeORM·AdminJS·Redis 完整设计 |
| 审计后端架构 | `docs/ARCHITECTURE_REVIEW.md` | 目录职责·分层评分·文档差异·改进建议 |
| 验证规则落地 | `docs/ARCHITECTURE_DRILL.md` | `POST /api/generate` 全链路逐层追踪 |
| 判断能否写业务 | `docs/IMPLEMENTATION_READINESS.md` | 20 项验收 + 是否阻塞业务开发 |
| 审计框架复用 | `docs/FRAMEWORK_AUDIT.md` | Express 能力利用率 + 封装合理性 |

---

## 五、当前状态

| 维度 | 状态 |
|------|:--:|
| 当前 Phase | Phase 2（前端重构）→ Phase 3（规划中） |
| 编译 | server `tsc --noEmit` ✅ · client `vue-tsc --noEmit` ✅ |
| 数据库 | TiDB Cloud · 8 张表 · 连接正常 |
| 20 项验收 | 🔴 0 阻塞 · 🟡 6 债务（Phase 3） · 🟢 14 通过 |
| 业务开发 | ✅ 可进入 |

查最新状态：`cat .phase` + `pnpm phase:status` + `docs/PROGRESS.md`

---

## 六、快速参考

```bash
# 开发
pnpm install                     # 安装依赖
cd server && pnpm dev            # 后端：tsx watch → :3001
cd client && pnpm dev            # 前端：vite → :5173
curl http://localhost:3001/health  # 健康检查

# 代码质量
cd server && npx tsc --noEmit    # 后端类型检查
cd client && npx vue-tsc --noEmit # 前端类型检查

# Phase 管理
pnpm phase:status                # 查看当前 Phase
pnpm phase:advance               # 推进 Phase（唯一入口）
```

### 关键目录

```
server/routes/          ← API 路由（auth/content/generate/prompt/admin）
server/workflow/nodes/  ← 7 节点（不可单独调，必须经 index.ts）
server/providers/       ← AI 模型（自注册，新增只加文件）
server/db/repositories/ ← 数据访问（路由/Workflow 唯一 DB 入口）
server/middleware/       ← 认证/限流/CORS
server/utils/           ← 纯工具（logger/validate/response/route-helpers）
shared/src/types/       ← 共享类型（auth/common/content/prompt/provider/workflow）
client/src/pages/       ← 页面组件（只渲染 DTO）
client/src/stores/      ← Pinia 状态管理
client/src/utils/       ← api-client（axios 封装）
docs/                   ← 13 个文档文件
.rules/                 ← 9 个 AI 开发规则
```
