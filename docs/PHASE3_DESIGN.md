# Phase 3 详细设计方案

> 原文档：`docs/PROGRESS.md` §3.3
> 状态：规划中，待 Phase 2 完成后执行
> 本版基于权限颗粒度与 API Key 管理的讨论修订，变更点见 3.0

#### Phase 3 — AdminJS + TypeORM + 权限系统（规划中，未实施）

> 以下为 Phase 3 完整设计方案，待 Phase 2 完成后执行。

##### 3.0 本次修订说明

对照 PRD 逐条核对原 §3.8 验收标准后，确认了 5 个决策点：

| # | 决策点 | 结论 |
|---|---|---|
| 1 | API Key 是否并入本阶段 | 并入，仅做 PRD §7.2 的最小闭环（加密存储 + 脱敏），不做多 Key / 配额 / 优先级 |
| 2 | `/api/content` 与 AdminJS 管理面板是否合并路由 | 不合并，两者共享同一套权限码 + repository 函数，靠 `data_scope` 区分返回范围 |
| 3 | 自定义角色本阶段是否要建一个跑通 | 只需 schema 支持，验收只验证 3 个系统内置角色 |
| 4 | `POST /api/generate` 是否纳入权限码体系 | 纳入，新增 `content:generate` |
| 5 | 缓存 TTL 对 GRANT / DENY 是否区别对待 | 不做差异化 TTL，改为「写入时主动失效对应用户的缓存」，120 秒 TTL 保留作兜底 |

另外还修复了审查中发现的几处硬伤：`super_admin` 唯一性没有约束、`user_permissions` 写入没有授权校验（层级可被绕过）、侧边栏渲染依据与后端权限判断依据不一致、Redis 缺失时的内存缓存在 Vercel Serverless 环境下基本失效但原文档写得像是等价方案。以下正文已按上述结论修订，未提及的小节维持原样。

##### 3.1 SQL 注入审计（Phase 2 现状 → Phase 3 通过 TypeORM 消除）

| 文件 | 行号 | 代码模式 | 判定 |
|------|------|---------|:--:|
| `user-repo.ts` | 85, 113 | `SET ${sets.join(', ')}` — 列名硬编码在 if 块中 | 🟢 安全 |
| `prompt-repo.ts` | 54-63 | `key` 来自 `Object.entries(fields)` 后拼入 `${key} = ?`，TS 类型约束 | 🟡 中 |
| `prompt-repo.ts` | 217-218 | `WHERE id IN (${placeholders})` — ids 走参数数组 | 🟢 安全 |
| `content-repo.ts` | 139 | 同上 | 🟢 安全 |
| `generation-repo.ts` | 87 | 同上 | 🟢 安全 |
| 其余 36 处 | — | 全部 `?` 占位符 + 参数数组 | 🟢 安全 |

**结论**：4 个 repo 共 41 次 SQL 调用，1 处潜在风险。Phase 3 用 TypeORM 后 100% 消除。

##### 3.2 权限系统数据库设计

**问题**：当前 `role ENUM` 无法扩展，无数据范围层，角色规则硬编码。

**核心设计**：角色实体化 + 数据范围 + 用户级覆盖。

```sql
-- 角色表（替代 ENUM，成为一等公民）
CREATE TABLE roles (
  id          VARCHAR(36)  PRIMARY KEY,
  code        VARCHAR(64)  UNIQUE NOT NULL,  -- 'super_admin' | 'admin' | 'user' | 自定义
  name        VARCHAR(64)  NOT NULL,
  level       INT          DEFAULT 0,        -- super_admin=100, admin=50, user=10
  is_system   TINYINT(1)   DEFAULT 0,        -- 系统内置角色，禁止删除/改 code
  status      TINYINT(1)   DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 用户-角色 多对多
CREATE TABLE user_roles (
  user_id VARCHAR(36) NOT NULL,
  role_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- 权限定义表
CREATE TABLE permissions (
  id          VARCHAR(36)  PRIMARY KEY,
  parent_id   VARCHAR(36)  DEFAULT NULL,
  name        VARCHAR(64)  NOT NULL COMMENT '权限名称（中文）',
  code        VARCHAR(128) NOT NULL UNIQUE COMMENT '权限标识（如 user:delete）',
  type        ENUM('menu','button','api') NOT NULL DEFAULT 'api',
  path        VARCHAR(255) DEFAULT NULL,
  method      VARCHAR(10)  DEFAULT NULL COMMENT 'GET/POST/PUT/DELETE',
  sort        INT          NOT NULL DEFAULT 0,
  status      TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 角色-权限 + 数据范围
CREATE TABLE role_permissions (
  role_id       VARCHAR(36) NOT NULL,
  permission_id VARCHAR(36) NOT NULL,
  data_scope    ENUM('ALL','SELF') DEFAULT 'SELF',  -- 全部数据 / 仅自己创建
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- 用户级权限覆盖（补丁层）
CREATE TABLE user_permissions (
  user_id       VARCHAR(36) NOT NULL,
  permission_id VARCHAR(36) NOT NULL,
  effect        ENUM('GRANT','DENY') NOT NULL,
  expires_at    DATETIME NULL,               -- 支持临时授权
  created_by    VARCHAR(36),
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);
```

**`roles.level` 用途**：替代 README 中"admin 不可删除 admin"这类硬编码规则，改为通用判断 — "A 能操作 B 当且仅当 A 最高角色 level > B 最高角色 level"。新增自定义角色时自动适用。

**`data_scope` 设计选择**：挂在 `role_permissions` 上（而非若依原版的角色级），做到比若依更细：同一 admin 对 `content:list` 可以是 ALL，对 `apikey:list` 可单独设为 SELF。后续扩展 TEAM 值时只需加枚举值 + `role_permissions` 挂 `team_id`。

###### 3.2.1 API Key 存储设计（新增，对应决策 1）

沿用 PRD §7.2 的最小闭环，**不新增表**，只在现有 `user_settings` 上补加密：

- `value` 字段原本存明文，改为存 JSON 字符串：`{"ciphertext": "...", "iv": "...", "tag": "..."}`（AES-256-GCM）
- 加密密钥来自独立环境变量 `API_KEY_ENCRYPTION_SECRET`，不复用 `JWT_SECRET`
- 展示层只返回脱敏结果（前后各 4 位），完整明文只在服务端调用 AI Provider 时解密使用，不通过任何接口返回给前端——所以不需要单独设计"查看明文"这类高危权限
- Redis 热缓存（PRD 要求，可选）缓存的是**解密后的明文**，供生成请求直接使用，避免每次调用都重新解密；缓存 key 建议 `apikey:{userId}:{provider}`，写入时立即刷新，不依赖过期时间

```ts
// server/services/api-key-service.ts
async function setApiKey(userId: string, provider: Provider, plaintext: string) {
  const encrypted = encryptAesGcm(plaintext, process.env.API_KEY_ENCRYPTION_SECRET!);
  await userSettingRepo.upsert(userId, `${provider}_api_key`, JSON.stringify(encrypted));
  await apiKeyCache.delete(`apikey:${userId}:${provider}`); // 让下次调用重新解密拿到最新值
}

async function getApiKeyForCall(userId: string, provider: Provider): Promise<string> {
  const cached = await apiKeyCache.get(`apikey:${userId}:${provider}`);
  if (cached) return cached;
  const row = await userSettingRepo.get(userId, `${provider}_api_key`);
  if (!row) throw new ApiKeyNotConfiguredError(provider);
  const plaintext = decryptAesGcm(JSON.parse(row.value), process.env.API_KEY_ENCRYPTION_SECRET!);
  await apiKeyCache.set(`apikey:${userId}:${provider}`, plaintext, { ttlSeconds: 300 });
  return plaintext;
}

function maskKey(plaintext: string): string {
  return plaintext.length <= 8 ? '****' : `${plaintext.slice(0, 4)}****${plaintext.slice(-4)}`;
}
```

###### 3.2.2 权限码清单（新增，对应决策 4）

以下为基于 PRD 功能需求梳理的权限码基线，**3.7 步骤 4（路由改造）时需与实际路由逐一核对**，缺失或多余的及时修正：

| 权限码 | 说明 | type | user | admin | super_admin |
|---|---|---|:--:|:--:|:--:|
| `content:generate` | 生成内容 | api | SELF | SELF | ALL |
| `content:list` | 内容列表 | api | SELF | ALL | ALL |
| `content:update` | 编辑内容 | api | SELF | ALL | ALL |
| `content:delete` | 删除内容 | api | SELF | ALL | ALL |
| `content:batchDelete` | 批量删除内容 | button | ✗ | ✗ | ALL |
| `prompt:list/create/update/delete` | Prompt 模板管理 | api | SELF | ALL | ALL |
| `prompt:setDefault` | 设置默认 Prompt | api | SELF | ALL | ALL |
| `prompt:version:list` | Prompt 版本历史 | api | SELF | ALL | ALL |
| `generation:list` | 生成记录列表 | api | SELF | ALL | ALL |
| `generation:clear` | 清空生成记录 | button | ✗ | ✗ | ALL |
| `publish:create/list` | 发布记录 | api | SELF | ALL | ALL |
| `user:list` | 用户列表 | menu | ✗ | ALL | ALL |
| `user:update`* | 修改用户（含改角色） | api | ✗ | ALL | ALL |
| `user:delete`* | 删除用户 | api | ✗ | ALL | ALL |
| `user:resetPassword`* | 重置密码 | button | ✗ | ALL | ALL |
| `system:log:list` | 应用日志 | menu | ✗ | ✗ | ALL |
| `system:setting:database` | 数据库连接配置 | menu+api | ✗ | ✗ | ALL |
| `apikey:view` | 查看自己的 API Key（脱敏） | api | SELF | SELF | SELF |
| `apikey:update` | 配置自己的 API Key | api | SELF | SELF | SELF |
| `prompt:batchDelete` | 批量删除 Prompt 模板 | button | ✗ | ✗ | ALL |
| `generation:batchDelete` | 批量删除生成记录 | button | ✗ | ✗ | ALL |

*标 `*` 的三项，`data_scope=ALL` 只代表"能看到列表"，实际执行编辑/删除/重置动作前，还要额外过 `assertCanManageUser` 的层级校验（见 3.3）——两层校验缺一不可。

##### 3.3 权限中间件 + 数据范围

**JWT 简化**：Token 只放 `userId`，不存角色。权限变更走缓存生效，无需重新登录。

```ts
// server/services/permission-service.ts
type DataScope = 'ALL' | 'SELF';
type EffectivePermissions = Map<string, DataScope>;

async function getEffectivePermissions(userId: string): Promise<EffectivePermissions> {
  const cached = await permissionCache.get(`perm:${userId}`);
  if (cached) return cached;

  const roleIds   = await userRoleRepo.getRoleIds(userId);
  const rolePerms = await rolePermissionRepo.getByRoleIds(roleIds);
  const overrides = await userPermissionRepo.getByUserId(userId);

  const effective: EffectivePermissions = new Map();
  // 多角色取并集，同一 code 取更宽的 scope
  for (const p of rolePerms) {
    const cur = effective.get(p.code);
    if (!cur || (cur === 'SELF' && p.dataScope === 'ALL'))
      effective.set(p.code, p.dataScope);
  }
  // 用户覆盖：DENY 摘除，GRANT 补上
  for (const o of overrides) {
    if (o.expiresAt && o.expiresAt < new Date()) continue;
    if (o.effect === 'DENY')  effective.delete(o.code);
    if (o.effect === 'GRANT') effective.set(o.code, effective.get(o.code) ?? 'ALL');
  }

  await permissionCache.set(`perm:${userId}`, effective, { ttlSeconds: 120 });
  return effective;
}
```

```ts
// permissionGuard — 替代 adminGuard / superAdminGuard
export function permissionGuard(code: string) {
  return async (req, res, next) => {
    const scope = (await getEffectivePermissions(req.user.id)).get(code);
    if (!scope) return res.status(403).json({ error: 'FORBIDDEN', code });
    req.dataScope = scope;  // 下发给 repository 层
    next();
  };
}
```

```ts
// 路由层：只声明权限码
router.get('/api/content', authMiddleware, permissionGuard('content:list'), handler);
router.post('/api/generate', authMiddleware, permissionGuard('content:generate'), rateLimiter, handler);

// Repository 层：根据 data_scope 过滤数据（关键！很多系统漏掉这层）
async function listContents(userId: string, scope: 'ALL' | 'SELF') {
  return scope === 'SELF'
    ? db.query('SELECT * FROM contents WHERE owner_id = ? ORDER BY created_at DESC', [userId])
    : db.query('SELECT * FROM contents ORDER BY created_at DESC');
}
```

**缓存主动失效（新增，对应决策 5）**

120 秒 TTL 只作兜底，真正的生效时机是写操作发生的当下：

```ts
async function removeUserRole(actorId: string, userId: string, roleId: string) {
  const role = await roleRepo.findById(roleId);
  if (role.code === 'super_admin') {
    const remaining = await userRoleRepo.countUsersWithRole(roleId);
    if (remaining <= 1) throw new ForbiddenError('不能移除系统内最后一个 super_admin');
  }
  await assertCanManageUser(actorId, userId);
  await userRoleRepo.remove(userId, roleId);
  await permissionCache.delete(`perm:${userId}`); // 立即失效，不等 TTL
}
```

覆盖范围：这套主动失效精准覆盖"对某一个用户做操作"（摘角色、改 `user_permissions`），也正是"发现异常要立刻处理"的天然形状。若是编辑角色定义本身（`role_permissions` 增删，影响一批人），精准失效需要角色→用户反查索引，成本更高——这类操作通常是计划内调整而非应急场景，继续吃 120 秒 TTL，不做特殊处理。

**用户管理层级校验（新增，修复原设计的授权漏洞）**

`user_permissions` 的写入、以及 `user:update` / `delete` / `resetPassword`，都必须过同一个校验，否则 `level` 层级保护形同虚设（例如某个 admin 可以绕过层级，给自己或小号 GRANT 一条 `system:setting:*` 这种本该只有 super_admin 才有的权限）：

```ts
async function assertCanManageUser(actorId: string, targetUserId: string) {
  const actorLevel = await getMaxRoleLevel(actorId);
  const targetLevel = await getMaxRoleLevel(targetUserId);
  if (actorLevel <= targetLevel) throw new ForbiddenError('不能操作同级或更高层级的用户');
}

async function grantUserPermission(actorId: string, targetUserId: string, code: string, effect: 'GRANT' | 'DENY') {
  await assertCanManageUser(actorId, targetUserId);
  if (effect === 'GRANT') {
    const actorPerms = await getEffectivePermissions(actorId);
    if (!actorPerms.has(code)) throw new ForbiddenError('不能分发自己都没有的权限');
  }
  await userPermissionRepo.upsert(targetUserId, code, effect);
  await permissionCache.delete(`perm:${targetUserId}`);
}
```

**JWT 变更提醒**：Token payload 从含 `role` 改为仅含 `userId` 是破坏性变更，上线时全部存量 token 会失效，用户需重新登录一次。建议提前在前端加一次性提示，或选择低峰期发布，避免被当成 bug 上报。

**缓存策略**：Redis 已配置 → 连接成功用 Redis → 失败静默降级内存。无 Redis 配置 → 静默走内存。**无控制台交互**。

**生产环境说明**：PRD 部署方案里后端跑在 Vercel（Serverless），实例间内存不共享。"静默降级内存缓存"在本地长驻进程开发时完全有效，但在 Vercel 上基本等于"每次请求都重新算一遍"——不算错，但不能当作真正命中缓存。Redis 在生产环境应视为强烈建议而非纯可选项。

##### 3.4 TypeORM 替换 mysql2

12 个 Entity（User/Content/PromptTemplate/PromptVersion/GenerationRecord/UserSetting/PublishRecord/AppLog/Role/Permission/RolePermission/UserPermission）——数量不变，API Key 复用 `UserSetting`，未新增实体。DataSource `synchronize: true`，保留 `schema.ts` 为手动建表参考。改造 `auth/content/generate/prompt` 四个路由 + `middleware/auth.ts`。**删除 `db/repositories/` 全部旧文件 + `routes/admin/` 全部手写子路由**。

##### 3.5 AdminJS 面板

`/admin` 替代自定义面板。复用 JWT authenticate。每个 Resource action 通过 `before` hook 对接权限判断——注意 AdminJS 的 hook 签名是 `(request, context) => request`，与 Express 中间件签名不同，`permissionGuard` 不能直接套用，需要一个适配层：

```ts
// server/admin/permission-adapter.ts
function adminPermissionCheck(code: string) {
  return async (request: any, context: any) => {
    const scope = (await getEffectivePermissions(context.currentAdmin.id)).get(code);
    if (!scope) throw new Error(`FORBIDDEN: ${code}`);
    context.dataScope = scope; // Resource 的 list/find 里读这个来决定要不要拼 WHERE owner_id
    return request;
  };
}
```

这样 `/api/content`（普通用户路由）和 AdminJS 的 Content Resource 用的是**同一个权限码** `content:list`、**同一个** `listContents(userId, scope)` repository 函数——区别只在于调用者角色带来的 `scope` 不同（user 拿到 SELF，admin/super_admin 拿到 ALL）。两边不合并成一个路由，复用发生在权限码和 repository 这一层，不在 URL 这一层（对应决策 2）。

Dashboard 统计卡片 + 趋势图。自定义 Action：重置密码/批量删除/清空生成记录，均挂 `adminPermissionCheck`。

##### 3.6 前端

侧边栏导航替代顶部导航，**菜单渲染依据权限码而非角色**（原方案是"按角色渲染"，与后端已经从角色判断改为权限码判断不一致——用户若通过 `user_permissions` 被单独 GRANT/DENY 了某项权限，菜单显示要跟这个保持一致，而不是仍按其角色硬编码）。`/admin` 由 AdminJS 服务端接管，移除 `AdminPage.vue` + 5 个 Tab 组件。

##### 3.7 分步执行

| # | 步 | 内容 |
|---|-----|------|
| 1 | TypeORM + 新表 | 依赖 + DataSource + 12 Entity + roles/permissions 初始化 Seeder（含 3.2.2 权限码清单 + `content:generate`） |
| 2 | 权限服务 + 中间件 | `getEffectivePermissions` + `permissionGuard` + `assertCanManageUser` + 缓存降级 + 写操作主动失效 |
| 3 | 用户迁移 | `users.role` ENUM → `user_roles` 多对多映射，JWT 去 `role`（提前通知：存量用户需重新登录） |
| 4 | 路由改造 | `auth/content/generate/prompt` → TypeORM + `dataScope` 过滤 + 核对 3.2.2 权限码清单与实际路由一一对应；`POST /api/generate` 补 `permissionGuard('content:generate')` |
| 5 | API Key 加密 | `user_settings` 值改存加密 JSON + 独立 `API_KEY_ENCRYPTION_SECRET` + 脱敏展示，替换现有明文存储逻辑 |
| 6 | AdminJS 面板 | authenticate + `adminPermissionCheck` 适配层 + Resource 按权限码 + Action 按权限 + Dashboard |
| 7 | 前端适配 | 侧边栏按权限码渲染 + `/admin` 接管 + 删旧组件 |
| 8 | 文档 + Phase Gate | README/SPEC/PRD/CLAUDE 同步 + phase-3-done tag |

##### 3.8 出口标准

- ✅ 3 个系统角色行为正确；角色数据模型支持新增自定义角色（无需改表结构即可插入新角色行），本阶段不要求实际创建自定义角色作为验收项
- ✅ 不允许移除系统内最后一个 `super_admin` 角色分配
- ✅ `level` 层级规则生效：`assertCanManageUser` 拦住"操作同级或更高层级用户"的请求
- ✅ `permissionGuard` 按权限码 + `data_scope` 双重管控；3.2.2 权限码清单与实际路由一一对应，无遗漏、无孤儿权限码
- ✅ Repository 层通过 `scope` 参数过滤数据行；`/api/content` 与 AdminJS Content Resource 复用同一权限码与同一 repository 函数
- ✅ JWT 仅含 `userId`；权限变更（角色调整、`user_permissions` 增删）写入后立即失效对应用户缓存，无需等待 120 秒；`role_permissions`（角色定义）改动仍走 120 秒 TTL
- ✅ 用户级 `user_permissions` 覆盖（GRANT/DENY + 过期）可用，且写入前必须通过 `assertCanManageUser` 与"不能分发自己都没有的权限"两项校验
- ✅ `POST /api/generate` 纳入权限码体系（`content:generate`），三个内置角色默认均 GRANT
- ✅ API Key 加密存储（AES-256-GCM，独立密钥）+ 脱敏展示（前后各 4 位）可用，明文不通过任何接口返回
- ✅ AdminJS `/admin` 可用，Resource/Action 均挂 `adminPermissionCheck`
- ✅ 前端侧边栏按权限码渲染，与后端 `permissionGuard` 判断结果一致
- ✅ Redis 未配置时静默走内存缓存且功能正确；生产环境（Vercel Serverless）建议明确要求配置 Redis，内存降级仅作本地开发兜底
- ✅ 旧 mysql2 repo + admin 子路由全部移除
- ✅ 以 user / admin / super_admin 三种账号分别登录回归测试：侧边栏菜单、可访问接口、`data_scope` 返回的数据范围均与预期一致
- ✅ 前端 `pnpm build` 成功
