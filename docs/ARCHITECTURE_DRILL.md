# 架构规则落地演练 — 最小模块全链路验证

> 演练日期：2026-07-05
> 验证模块：`POST /api/generate`（内容生成）
> 验证目标：确认分层架构规则在实际代码中可落地、可执行、可验证

---

## 一、验证方法

选取当前项目中最完整的请求链路 ——「内容生成」作为演练对象，逐层追踪代码执行路径，对每一层回答三个问题：

1. **这个文件属于哪一层？** — 对照 `docs/SPEC.md` 六层架构进行定位
2. **它做了什么？（遵守了哪些规则）** — 列出具体代码行为与架构规则之间的对应关系
3. **它没做什么？（遵守了哪些禁止项）** — 列出该层刻意不做的行为，验证边界清晰

最后给出「如果破坏规则会怎样」的反面案例。

---

## 二、全链路逐层追踪

### 请求进入 → 响应返回的完整调用链

```
HTTP Request (POST /api/generate, Authorization: Bearer <token>)
 │
 ▼
┌─ middleware/auth.ts         ─ 1. JWT 验证 + 注入 req.user
│  middleware/rate-limit.ts   ─ 2. 用户级限流 10次/分钟
└──────────────────────────────────────────────────────┘
 │
 ▼
┌─ routes/generate.ts        ─ 3. 参数校验 + 调用 Workflow
│  (Express Router)          ─ 4. 保存结果 + 记录生成
│                            ─ 5. 响应格式化 + 错误映射
└──────────────────────────────────────────────────────┘
 │
 ▼
┌─ workflow/index.ts         ─ 6. Pipeline 调度
│  ├─ nodes/input.ts         ─ 7. 必填校验 + 默认值
│  ├─ nodes/prompt.ts        ─ 8. 查询模板 + 构建 FinalPrompt
│  ├─ nodes/provider.ts      ─ 9. 调 AI Provider（≤3 次重试）
│  ├─ nodes/parse.ts         ─ 10. JSON.parse 原始响应
│  ├─ nodes/validate.ts      ─ 11. OutputSchema 结构校验（失败重试）
│  ├─ nodes/dto.ts           ─ 12. 注入 ID + Metadata
│  └─ nodes/output.ts        ─ 13. 最终透传
└──────────────────────────────────────────────────────┘
 │                    │
 │  ┌─ providers/            ─ AI SDK 调用（gemini/deepseek/mock）
 │  │  index.ts              ─ Provider 注册表
 │  └─ gemini-provider.ts    ─ 具体 Provider 实现
 │
 │  ┌─ db/repositories/      ─ 数据持久化
 │  │  content-repo.ts       ─ contents 表 CRUD
 │  └─ generation-repo.ts    ─ generation_records 表写入
 │
 ▼
HTTP Response (Content DTO JSON)
```

---

## 三、逐层审查

### 第 1 层 — 认证中间件 `middleware/auth.ts:29-53`

```ts
export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;          // ① 从请求头提取
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: { ... } });        // ② 失败 → 401
    return;
  }
  const payload = jwt.verify(token, config.jwt.secret); // ③ JWT 验证
  req.user = payload;                                 // ④ 注入 req.user
  next();                                             // ⑤ 放行
}
```

| 检查项 | 规则来源 | 遵守 |
|--------|---------|:--:|
| 只做认证，不做业务逻辑 | CLAUDE.md「后端路由不含业务逻辑」 | ✅ |
| 失败返回统一错误格式 `{code, message}`（通过 `fail()` 工厂函数） | SPEC §13.1 AppError | ✅ |
| 通过 `config.jwt.secret` 读密钥，不裸读 `process.env` | CLAUDE.md「原生 API 必须封装」 | ✅ |
| 不查数据库判断角色（JWT 内嵌 role，仅用于日志/前端展示） | — | ⚠️ 已知设计问题，Phase 3 改为 JWT 只存 userId |
| 不直接操作 req/res body | 中间件职责 | ✅ |

**禁止行为检查**：
- ❌ 不查数据库验证用户是否存在（信任 JWT 签名）
- ❌ 不做权限判断（那是 Guard 的职责，不在 authMiddleware 里）
- ❌ 不修改请求体

---

### 第 2 层 — 限流中间件 `middleware/rate-limit.ts`

```ts
export const generateLimiter = rateLimit({
  windowMs: 60_000,        // 1 分钟窗口
  max: 10,                 // 最多 10 次
  keyGenerator: (req) => req.user!.userId,  // 按用户维度限流
});
```

| 检查项 | 规则来源 | 遵守 |
|--------|---------|:--:|
| 10 次/分钟/用户 | PRD §7.4 | ✅ |
| 按 userId 而非 IP（生成接口保护的是用户资源） | — | ✅ |
| 不包含业务逻辑 | 中间件职责 | ✅ |

---

### 第 3 层 — 路由 `routes/generate.ts:25-125`

```ts
router.post('/', authMiddleware, generateLimiter, async (req, res) => {
  const { topic, platform, provider } = req.body;  // ① 提取参数

  if (!topic || !platform || !provider) {           // ② 参数校验
    res.status(400).json({ error: { code: 'INPUT_ERROR', ... } });
    return;
  }

  const content = await executeWorkflow(input);     // ③ 唯一业务入口

  await contentRepo.save(userId, content);          // ④ 通过 Repository 保存
  await generationRepo.record({ ... });             // ⑤ 通过 Repository 记录

  res.json({ content });                            // ⑥ 统一响应格式
});
```

| 检查项 | 规则来源 | 遵守 |
|--------|---------|:--:|
| 只做参数校验，业务逻辑丢给 Workflow | CLAUDE.md「后端路由不含业务逻辑」 | ✅ |
| 不拼接 Prompt、不调 AI、不解码 JSON | CLAUDE.md 代码边界 | ✅ |
| 数据库操作走 Repository | CLAUDE.md「数据库操作走 Repository」 | ✅ |
| 统一错误格式映射（通过 `fail()` → HTTP 状态码） | SPEC §13.1 | ✅ |
| 使用 `createLogger` 而非 `console.log` | CLAUDE.md 操作边界 | ✅ |
| 中间件链式挂载（authMiddleware → generateLimiter → handler） | Express 惯例 | ✅ |

**禁止行为检查**：
- ❌ 不直接 `pool.query(...)` — 全部走 `contentRepo` / `generationRepo`
- ❌ 不直接 `fetch('https://api.gemini...')` — 通过 `executeWorkflow` → Provider
- ❌ 不手写 JSON.parse 处理 AI 响应 — 由 Workflow Parse Node 负责
- ❌ 不含 if/switch 判断平台做不同处理 — 平台差异在 Prompt Node 中处理

---

### 第 4 层 — Workflow 引擎 `workflow/index.ts:37-91`

```ts
export async function executeWorkflow(input: WorkflowInput): Promise<Content> {
  let ctx = createContext(input);     // ① 创建统一上下文

  ctx = await inputNode(ctx);         // ② 7 节点串行执行
  ctx = await promptNode(ctx);
  ctx = await providerNode(ctx);      // ← Provider Node 内部调 AI
  ctx = await parseNode(ctx);         // ← Parse Node 内部 JSON.parse
  ctx = await validateNode(ctx);      // ← 失败注回 userPrompt 重试 ≤3
  ctx = await dtoNode(ctx);
  ctx = await outputNode(ctx);

  return ctx.output!;                 // ③ 返回 Content DTO
}
```

| 检查项 | 规则来源 | 遵守 |
|--------|---------|:--:|
| 唯一业务编排中心，不直接调 AI | SPEC §5.1 Workflow Engine | ✅ |
| 节点串行执行，数据单向流动 | SPEC §5.1 无状态 | ✅ |
| Validate 失败重试 ≤3 次 | CLAUDE.md「Validate 重试 ≤3 次」 | ✅ |
| 不保存数据（Stateless） | SPEC §5.1 | ✅ |
| 不操作 req/res | 分层约束 | ✅ |
| 异常统一为 WorkflowError 格式 | SPEC §13.1 | ✅ |

**关键设计：Validate 失败后的修正注入**

```ts
// workflow/index.ts:68-76
if (ctx.finalPrompt) {
  ctx.finalPrompt = {
    ...ctx.finalPrompt,
    userPrompt:
      ctx.finalPrompt.userPrompt +
      `\n\n【上次生成的内容校验未通过，请修正：】\n${wfErr.message}`,
  };
}
```

这是 Workflow 层的核心价值：将 AI 输出不符合 OutputSchema 的问题**自动修正**，而非把错误直接抛给用户。路由层完全不知道重试发生了——它只拿到最终的 Content DTO 或 WorkflowError。

---

### 第 5 层 — Input Node `workflow/nodes/input.ts:15-60`

```ts
export async function inputNode(ctx: WorkflowContext): Promise<WorkflowContext> {
  if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
    throw Object.assign(new Error('topic 不能为空'), { workflowError: { ... } });
  }
  if (!platform || typeof platform !== 'string') { /* 同上 */ }
  if (!provider || typeof provider !== 'string') { /* 同上 */ }
  return { ...ctx, input: { ...ctx.input, topic: topic.trim() } }; // 标准化
}
```

| 检查项 | 规则来源 | 遵守 |
|--------|---------|:--:|
| 单一职责：只做输入校验 + 标准化 | SPEC 原则四 | ✅ |
| 错误统一为 WorkflowError 格式 | SPEC §13.1 | ✅ |
| 不查数据库 | Workflow 约束 | ✅ |

---

### 第 6 层 — Provider Node + Provider 实现

```
workflow/nodes/provider.ts          providers/index.ts
─────────────────────────           ────────────────────
ctx = await providerNode(ctx)       registerProvider('gemini', geminiProvider)
  │                                   registerProvider('deepseek', deepseekProvider)
  ├─ getProvider(input.provider)      registerProvider('mock', mockProvider)
  ├─ provider.generate(prompt)
  ├─ 失败 → 重试（≤3，指数退避）      providers/gemini-provider.ts
  └─ ctx.rawResponse = text           ──────────────────────────
                                      implements AIProvider {
                                        async generate(prompt) {
                                          // 调 @google/genai SDK
                                        }
                                      }
```

| 检查项 | 规则来源 | 遵守 |
|--------|---------|:--:|
| Workflow 通过 `providers/index.ts` 注册表调 AI | CLAUDE.md「Provider 不可绕过」 | ✅ |
| Provider 只返回原始文本，不做解析 | SPEC §5.3 | ✅ |
| 新增 Provider 只需新增文件 + import 自注册 | SPEC §14.1 | ✅ |
| Provider 不访问数据库 | Provider 约束 | ✅ |

**自注册模式（关键设计）**：
```ts
// providers/gemini-provider.ts 最后一行
registerProvider('gemini', geminiProvider);
```
这意味着新增模型时，只需创建一个新文件并在 `app.ts` 中 import 它——无需修改 Workflow 或路由代码。

---

### 第 7 层 — Repository `db/repositories/content-repo.ts:41-70`

```ts
export async function save(userId: string, content: Content): Promise<void> {
  const pool = getPool();                         // ① 通过 client.ts 获取连接池
  await pool.query(
    `INSERT INTO contents (...) VALUES (?,?,...)   // ② 参数化查询
     ON DUPLICATE KEY UPDATE ...`,
    [content.id, userId, ..., JSON.stringify(content.pages)],  // ③ JSON 序列化
  );
}
```

| 检查项 | 规则来源 | 遵守 |
|--------|---------|:--:|
| 所有 SQL 参数化（`?` 占位符 + 参数数组） | CLAUDE.md 安全边界 | ✅ |
| JSON 列序列化/反序列化由 Repo 负责 | 自注释 | ✅ |
| 不含业务判断（如"内容是否合法"） | Repository 约束 | ✅ |
| 通过 `getPool()` 而非裸 `mysql2.createConnection` | CLAUDE.md「原生 API 必须封装」 | ✅ |

---

## 四、规则符合度总结

| 架构规则 | 来源 | 验证层 | 符合 |
|---------|------|--------|:--:|
| Workflow 是唯一业务入口 | CLAUDE.md + SPEC | routes/generate.ts → executeWorkflow() | ✅ |
| 路由不含业务逻辑 | CLAUDE.md | generate.ts 只有校验+调Workflow+保存+响应 | ✅ |
| 数据库操作走 Repository | CLAUDE.md | 所有 SQL 在 db/repositories/ 下 | ✅ |
| Provider 不可绕过 | CLAUDE.md | 通过 providers/index.ts 注册表 | ✅ |
| 原生 API 必须封装 | CLAUDE.md | getPool() / config.xxx / createLogger() | ✅ |
| Prompt 修改 = 新版本 | CLAUDE.md | prompt Node → prompt_versions 表 insert | ✅ |
| AI 输出 → Content DTO | CLAUDE.md | Parse → Validate → DTO 三个节点协作 | ✅ |
| 统一错误格式 | SPEC §13 | WorkflowError → HTTP status map | ✅ |
| 禁止 console.log | CLAUDE.md | 全局使用 createLogger() | ✅ |
| 参数化查询防注入 | CLAUDE.md + PRD | 全部 `?` 占位符 | ✅ |

---

## 五、反面案例：如果破坏规则会怎样

以下是**假设的错误做法**，展示规则被破坏后的后果：

### ❌ 反面案例 1：路由里直接调 AI

```ts
// 错误：在路由中直接调 Gemini SDK
router.post('/generate', async (req, res) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });  // ❌ 绕过 Provider
  const response = await ai.models.generateContent({ ... });            // ❌ 路由含业务逻辑
  const text = response.text;
  const parsed = JSON.parse(text);                                      // ❌ 路由解析 AI 输出
  await pool.query('INSERT INTO contents ...', [parsed]);               // ❌ 路由直接写 SQL
  res.json({ content: parsed });
});
```

**违反的规则**：4 条
- 绕过 Workflow（CLAUDE.md 执行原则 2）
- 绕过 Provider（CLAUDE.md 代码边界 4）
- 路由含业务逻辑（CLAUDE.md 代码边界 2）
- 直接写 SQL（CLAUDE.md 代码边界 3）

**后果**：每新增一个模型要改所有路由、Prompt 版本无法追踪、代码不可测试。

---

### ❌ 反面案例 2：散落原生 API 调用

```ts
// 错误：散落 process.env 和 console.log
const key = process.env.GEMINI_API_KEY;         // ❌ 应走 config.ts
console.log('AI 调用成功', result);              // ❌ 应用 createLogger()
const conn = await mysql.createConnection({...}); // ❌ 应用 getPool()
const hash = crypto.createHash('sha256').update(pwd).digest('hex'); // ❌ 应用封装的 hash 函数
```

**违反的规则**：1 条（CLAUDE.md 代码边界 5）

**后果**：无法统一切换配置源、无法控制日志级别、无法复用连接池、安全算法更换需要全局搜索替换。

---

### ❌ 反面案例 3：Prompt 覆盖而非新建版本

```ts
// 错误：直接 UPDATE 覆盖已有 Prompt
await pool.query('UPDATE prompt_versions SET system_prompt = ? WHERE id = ?', [newPrompt, id]);
```

**违反的规则**：1 条（CLAUDE.md 执行原则 4）

**后果**：历史生成记录无法复现、A/B 测试无法进行、回滚到旧版本不可能。

---

## 六、新增模块合规检查清单

未来新增模块时，按此清单逐项检查：

```
□ 路由文件只做三件事：参数校验 → 调 Workflow/Service → 响应格式化
□ 路由不写 SQL（走 Repository）
□ 路由不调 AI SDK（走 Provider）
□ 路由不拼接 Prompt（走 Workflow）
□ 所有 SQL 使用 ? 占位符（参数化查询）
□ 所有 AI 调用通过 providers/index.ts 注册表
□ 所有日志使用 createLogger()，无 console.log
□ 所有配置读取走 config.ts，无裸 process.env
□ 所有数据库连接走 getPool()，无裸 createConnection
□ 错误返回统一格式 { error: { code, message } }
□ 新增 Provider 只需新增文件 + 自注册
□ 新增路由在 app.ts 统一挂载
```

---

## 七、演练结论

**以 `POST /api/generate` 为例的完整链路验证通过。**

| 验证维度 | 结果 |
|---------|:--:|
| 分层边界清晰（路由≠Workflow≠Provider≠Repository） | ✅ |
| 每一层的「允许做」与「禁止做」可通过代码静态检查验证 | ✅ |
| 反面案例展示了破坏规则的直接后果 | ✅ |
| 新增模块有可操作的合规检查清单 | ✅ |

**唯一的设计债务**：JWT 内嵌 role（Phase 3 改为只存 userId + permissionGuard 动态查权限）。当前架构已为此预留扩展路径：`authMiddleware` 只做 JWT 验证，`adminGuard`/`superAdminGuard` 是独立中间件，替换为 `permissionGuard(code)` 时只需改中间件链，路由逻辑不受影响。
