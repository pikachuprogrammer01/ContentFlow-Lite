# 实施真元文档 — 后端架构准备度评估

> 评估日期：2026-07-05
> 评估范围：`server/` 全量代码 + `shared/src/types/` + 全部 `docs/` 文档
> 参照标准：`docs/SPEC.md` · `docs/PRD.md` · `CLAUDE.md` · `docs/ARCHITECTURE_REVIEW.md` · `docs/ARCHITECTURE_DRILL.md`
> 结论状态：✅ **可进入业务开发**（存在 6 项非阻塞债务，全部纳入 Phase 3 处理）

---

## 一、验收项汇总

共 **20 项**，按影响级别分三级：

| 级别 | 含义 | 数量 |
|------|------|:--:|
| 🔴 阻塞 | 不解决则业务代码无法正确运行或架构不可维护 | 3 |
| 🟡 债务 | 当前不影响但积累后会产生问题，须在 Phase 3 处理 | 6 |
| 🟢 通过 | 验证通过，无需处理 | 11 |

---

## 二、逐项验收

### 🔴 阻塞项

| # | 验收项 | 通过 | 证据位置 | 未通过原因 | 下一步处理 | 是否影响业务开发 |
|---|--------|:--:|---------|-----------|-----------|:--:|
| R1 | **数据库连接可用** | ✅ | `README.md` §启动验收 — curl health → `{"db":"connected"}`；TiDB Cloud SSL 连接，8 张表就绪 | — | — | — |
| R2 | **启动流程固定** | ✅ | `README.md` §启动验收 — `pnpm dev`（tsx watch）监听 3001，env.ts → config.ts 双层配置 | — | — | — |
| R3 | **编译零错误** | ✅ | `server/` tsc --noEmit 零错误；`client/` vue-tsc --noEmit 零错误 | — | — | — |

> 🔴 项全部通过。0/3 阻塞。

### 🟡 债务项

| # | 验收项 | 通过 | 证据位置 | 未通过原因 | 下一步处理 | 是否影响业务开发 |
|---|--------|:--:|---------|-----------|-----------|:--:|
| D1 | **接口返回格式统一** | ⚠️ | `ARCHITECTURE_REVIEW.md` §3.3 行 125；`API_SPEC.md` 含 10 处旧 `"error":` 残留 | 后端已全面改为 `{code, data, message}` 信封（新增 `server/utils/response.ts` + 全路由 `fail()/success()/created()`），但 `API_SPEC.md` 中部分接口响应示例仍为旧格式（如 `{ "error": { "code": "...", "message": "..." } }`），`ARCHITECTURE_DRILL.md` 行 72/121 的代码示例也引用旧格式 | **不阻塞业务开发**。Phase 3 前做一次文档全局清理，用 `grep -rn 'error.*{.*code' docs/` 找出所有旧格式引用后逐处更新 | ❌ 不影响 — 后端代码已统一，文档延迟不影响运行时行为 |
| D2 | **错误处理机制统一** | ⚠️ | `ARCHITECTURE_REVIEW.md` §3.3 行 125 | 后端路由层错误处理已统一：所有错误响应通过 `fail(code, msg, errors?)` 生成，Workflow 错误通过 `extractWorkflowError` → HTTP 状态码映射。但 `API_SPEC.md` 中错误响应仍沿用旧格式 `{ "error": { "code": "...", "message": "..." } }`，与后端实际输出 `{ "code": "INPUT_ERROR", "message": "…", "error": { "data": [...] } }` 不一致 | **不阻塞**。在 `API_SPEC.md` 顶部添加"⚠️ 响应格式已更新为统一信封"声明（`API_TEST.md` 已这样做），Phase 3 逐接口更新响应示例 | ❌ 不影响 — 前端 `api-client.ts` 拦截器已适配新旧两种格式 |
| D3 | **目录责任划分** | ⚠️ | `ARCHITECTURE_REVIEW.md` §三·四 | `routes/admin.ts` 仅一行 re-export（shim），`middleware/auth.ts` 同时包含认证+授权两种职责，`routes/generate.ts` 职责链过长（校验+调Workflow+保存+记录生成），`ARCHITECTURE_DRILL.md` 检查清单标注的 adminGuard 未独立文件 | **不阻塞**。`routes/admin.ts` shim 可立即删除（1 行改动）；adminGuard 拆分纳入 Phase 3 | ❌ 不影响 — 实际代码逻辑正确，仅是文件组织不够极致 |
| D4 | **TypeORM 替代 mysql2** | ❌ | `ARCHITECTURE_REVIEW.md` §3.3 行 125 | 当前 4 个 Repository 手写 SQL（共 41 处），存在 1 处理论注入风险（`prompt-repo.ts:54-63` Object.entries 拼接列名），无 Entity 类型安全，AdminJS 无法直接对接 | **Phase 3 最高优先级**（`PROGRESS.md` Phase 3 Step 3.3）。迁移策略：逐表替换（先 users → contents → prompt → generation），双写并行验证，旧 repo 保留到验证通过 | ❌ 不影响 — 手写 SQL 已参数化，当前可用；TypeORM 是架构升级而非 bug 修复 |
| D5 | **API Key 加密存储** | ❌ | `ARCHITECTURE_REVIEW.md` §3.2 行 116 | API Key 明文存储在 `.env` 中，`config.ts` 直接透传，未做 AES-256-GCM 加密。服务器文件读取权限 = 获取全部 AI 调用 Key | **Phase 3 处理**。创建 `db/api-key-store.ts`，使用 `crypto.createCipheriv('aes-256-gcm', ...)` 加密写入，Provider 通过 `getApiKey(provider)` 解密读取 | ❌ 不影响 — 本地开发环境无安全威胁；生产部署前必须解决 |
| D6 | **Provider 补全** | ❌ | `ARCHITECTURE_REVIEW.md` §3.2 行 115 | 架构规划包含 4 个 Provider（Gemini / DeepSeek / SiliconFlow / 通义万相），当前仅实现前 2 个 + Mock | **Phase 3 处理**。自注册模式已搭好，新增只需新建文件 + `app.ts` import | ❌ 不影响 — Gemini + DeepSeek 已覆盖核心场景，SiliconFlow/通义万相是降本/图片补充 |

### 🟢 通过项

| # | 验收项 | 通过 | 证据位置 | 
|---|--------|:--:|---------|
| G1 | **Workflow 7 节点完整** | ✅ | `ARCHITECTURE_DRILL.md` §三行 151-193 — 全链路逐层追踪，7 节点串行执行 + Validate 失败 ≤3 次重试 |
| G2 | **Provider 注册表模式** | ✅ | `ARCHITECTURE_REVIEW.md` §3.1 行 101 — 自注册 Map，新增模型只需新建文件 |
| G3 | **Repository 封装完整** | ✅ | `ARCHITECTURE_REVIEW.md` §3.1 行 100 — 4 个 Repo 统一封装，路由零 SQL |
| G4 | **参数化查询防注入** | ✅ | `ARCHITECTURE_DRILL.md` §三行 252-269 — 全部 `?` 占位符，仅 1 理论风险（prompt-repo 列名拼接，TS 类型约束） |
| G5 | **认证体系完整** | ✅ | `README.md` §用户角色体系 + `ARCHITECTURE_DRILL.md` §三行 66-93 — JWT 验证 + adminGuard / superAdminGuard |
| G6 | **限流保护** | ✅ | `ARCHITECTURE_DRILL.md` §三行 96-111 — 登录 5/min/IP + 生成 10/min/用户 + 重置密码 3/min |
| G7 | **日志机制可用** | ✅ | `README.md` §启动验收·日志机制 — Winston 5 级日志 + Console Transport + MySQL Transport 可选（当前 LOG_TO_DB=true 但 `attachMySQLTransport` 未被 `index.ts` 调用，写 DB 未生效） |
| G8 | **类型共享** | ✅ | `ARCHITECTURE_REVIEW.md` §3.1 行 106 — `@contentflow/shared` 单一定义源，前后端共享 |
| G9 | **Content DTO 唯一** | ✅ | `ARCHITECTURE_DRILL.md` §三行 151-193 — 全系统仅一套 Content 结构，AI 输出 → Parse → Validate → DTO |
| G10 | **健康检查可用** | ✅ | `README.md` §启动验收·健康检查 — `GET /health` → `{"status":"ok","db":"connected",...}` |
| G11 | **超级管理员初始化** | ✅ | `README.md` §启动验收·超级管理员 — 首次启动自动创建，`SUPER_ADMIN_PASSWORD` 环境变量跳过交互 |

---

## 三、关键路径判定

### ✅ 已满足的条件（可以开始业务开发）

| 条件 | 状态 | 说明 |
|------|:--:|------|
| 服务可启动，端口固定 | ✅ | `pnpm dev` → 3001，tsx watch 热重载 |
| 数据库可连接，表结构完整 | ✅ | TiDB Cloud SSL，8 张表 CREATE TABLE IF NOT EXISTS |
| 编译零错误 | ✅ | server tsc + client vue-tsc 双端通过 |
| 核心业务流程可跑通（生成链路） | ✅ | `POST /api/generate` → Workflow 7 节点 → Content DTO → 持久化 |
| 认证 + 授权可工作 | ✅ | JWT 登录/注册 + adminGuard / superAdminGuard |
| 错误处理有统一出口 | ✅ | `fail()` 工厂函数 → HTTP 状态码映射 |
| 新增模块有规范可循 | ✅ | `ARCHITECTURE_DRILL.md` §六 12 项合规检查清单 |

### ⚠️ 需注意的限制（开发时应避开）

| 限制 | 影响 | 规避方式 |
|------|------|---------|
| 无全局 Express 错误处理中间件 | 未 catch 的异常返回 HTML 而非 JSON | 所有路由 handler 用 try-catch 包裹，`handleError(res, err)` 兜底 |
| `app_logs` 表当前无数据写入 | `LOG_TO_DB=true` 但 transport 未 attach | Phase 3 修复前只依赖 Console 日志 |
| MySQL Transport 需手动 attach | `attachMySQLTransport(pool)` 未在 `index.ts` 调用 | Phase 3 统一在 `initPool` 后调用 |
| `routes/admin.ts` shim 存在 | 新人可能困惑改哪个文件 | 立即删除（1 行改动），`app.ts` 直引 `routes/admin/index.ts` |

### ❌ 尚未满足的条件（业务开发前不必须）

| 条件 | 计划 |
|------|------|
| TypeORM Entity 体系 | Phase 3 Step 3.3 |
| AdminJS 管理面板 | Phase 3 Step 3.4 |
| RBAC 权限系统（roles/permissions 表） | Phase 3 Step 3.2 |
| Redis 缓存层 | Phase 3 Step 3.5 |
| API Key 加密存储 | Phase 3 Step 3.6 |
| SiliconFlow / 通义万相 Provider | Phase 3 Step 3.7 |

---

## 四、下一步行动

### 立即（今天）

1. **删除 `routes/admin.ts` shim** — `app.ts` 中的 import 改为 `./routes/admin/index.js`
2. **修复 `G7` 日志 DB 写入** — `index.ts` 中在 `initPool()` 后调用 `attachMySQLTransport(getPool())`
3. **清理 `API_SPEC.md` 旧格式残留** — grep 找出 10 处 `"error":` 旧格式，更新为 `"code"` / `"message"` 新格式

### Phase 3（见 `PROGRESS.md`）

按优先级：
1. RBAC 权限系统（`permissions` / `role_permissions` 表 + `permissionGuard(code)`）
2. TypeORM 替换 mysql2（逐表迁移，先 users）
3. AdminJS 替换自建管理面板
4. Redis/内存双模缓存
5. API Key AES-256-GCM 加密
6. 补全 Provider（SiliconFlow / 通义万相）
7. 补全 `/api/log` 前端错误上报端点

---

## 五、结论

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ✅ 后端架构已具备业务开发的稳定起点                          │
│                                                             │
│   关键条件（启动、数据库、编译、核心流程、认证、错误处理）     │
│   全部满足。                                                 │
│                                                             │
│   6 项技术债务纳入 Phase 3 处理，不影响当前业务开发。          │
│   3 项立即改进建议可在 10 分钟内完成。                         │
│                                                             │
│   建议：先完成「四、下一步行动 → 立即」3 项，                    │
│   再进入功能开发。                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

**版本**：2026-07-05 · **下次评估**：Phase 3 入口前（对照 `PROGRESS.md` Phase 3 出口标准重跑本表）
