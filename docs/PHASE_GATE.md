# Phase Gate — 项目推进硬指标系统

> 面向人群：开发者、Code Review 者、AI 协作者（Claude/Reasonix）
> 维护者：项目 owner
> 最后更新：2026-07-03

---

## 一、设计理念

### 1.1 问题

软件开发中常见的推进问题：

- "这个功能还没做完但先提交了" → 积压烂代码
- "Phase 1 的事情 Phase 3 才补" → 技术债
- "上次说的约定大家都忘了" → 口头规则不可靠

### 1.2 解法

**用脚本替代约定**。每一个 Phase 的出口标准写成可执行代码。不通过 → 不让进下一个 Phase。Git commit/push/CI 三层卡口。

### 1.3 不是 DevOps 流水线

Phase Gate 关注的是 **开发阶段之间的硬性递进**，不是「代码能不能跑」。CI 只管 lint/build/test，Phase Gate 管「该写的文件都写了吗、该建的目录都建了吗、上一个 Phase 的 tag 打了吗」。

---

## 二、Phase 划分

```
Phase 0: 基础设施（DB + Express 骨架）
    │  出口：Express 启动 + DB 连接 + 8 张表创建
    ▼
Phase 1: 后端核心（Auth + Workflow + Provider + API）
    │  出口：curl POST /api/generate 返回 Content DTO
    ▼
Phase 2: 前端重构（Naive UI + 认证 + 生成 + 编辑）
    │  出口：浏览器全流程走通
    ▼
Phase 3: 管理增强（AdminJS + Settings + 图片 + 发布）
    │  出口：MVP 完整可部署
    ▼
Phase 4: 测试与发布（E2E + 部署 + 文档收尾）
    │  出口：所有测试通过 + 线上可访问
```

每个 Phase 之间有 **硬停顿**。出口不达标，不得进入下一个 Phase。

---

## 三、系统架构

### 3.1 文件布局

```
ContentFlow-Lite/
├── .phase                          # 当前 Phase 编号（纯数字，如 "0"）
├── scripts/
│   ├── phase-gate.sh               # 核心：Phase 出口检查 + 推进逻辑
│   ├── pre-commit-hook.sh          # git commit 时触发（软警告）
│   ├── pre-push-hook.sh            # git push 时触发（硬阻断）
│   └── enforce-phase.sh            # 自检 hooks 完整性（自动修复）
├── .git/hooks/
│   ├── pre-commit → ../../scripts/pre-commit-hook.sh   # 符号链接
│   └── pre-push   → ../../scripts/pre-push-hook.sh     # 符号链接
├── .github/workflows/
│   └── phase-gate.yml              # GitHub Actions CI（服务端 100% 保证）
└── package.json                    # phase:check / phase:advance / phase:status / postinstall
```

### 3.2 三层防线

```
┌─────────────────────────────────────────────────────────┐
│ 第一层：git commit                                      │
│   pre-commit hook                                      │
│   ⚠️  软警告 — 显示当前 Phase 还有多少 ❌               │
│   不阻断 commit（避免紧急修复被卡）                     │
├─────────────────────────────────────────────────────────┤
│ 第二层：git push                                        │
│   pre-push hook                                        │
│   🚫 硬阻断 — 检查所有前置 Phase 的 phase-{N}-done tag │
│   缺任何一个 tag → 拒绝 push，给出明确提示             │
│   可被绕过：git push --no-verify                       │
├─────────────────────────────────────────────────────────┤
│ 第三层：GitHub Actions CI（服务端）                     │
│   .github/workflows/phase-gate.yml                     │
│   🚫 硬阻断 — 同样的 tag 链检查跑在 GitHub 服务器上    │
│   无法绕过。配合 branch protection → 真正 100%         │
└─────────────────────────────────────────────────────────┘
```

---

## 四、日常命令

### 4.1 三个核心命令

```bash
pnpm phase:status     # 查看当前 Phase 编号 + 出口检查摘要
pnpm phase:check      # 完整跑一遍出口检查，列出所有 ✅/❌
pnpm phase:advance    # 先跑 check → 全部 ✅ 才放行 → 写 .phase → git tag → 进入下一 Phase
```

### 4.2 典型工作流

```bash
# 开始 Phase 0
$ pnpm phase:status
📌 当前 Phase: 0
  结果: 0/12 通过
  ❌ Phase 0 出口不达标 — 12 项未通过

# 写代码 ... 完成所有 Phase 0 任务

$ pnpm phase:check
  结果: 12/12 通过
  ✅ Phase 0 出口达标

$ pnpm phase:advance
  正在进入 Phase 1 ...
  ✅ .phase → 1
  ✅ git tag: phase-0-done

  ━━━━━━━━━━━━━━━━━━━━━━
    现在进入 Phase 1
  ━━━━━━━━━━━━━━━━━━━━━━
```

### 4.3 日常 git 操作的表现

```bash
$ git commit -m "..."
⚠️  Phase 0 出口检查未通过。可以继续 commit，但 push 会被拦截。

$ git push
🚫 PUSH 被阻止：Phase 1 进行中，但 Phase 0 尚未标记完成 (tag phase-0-done 缺失)。
   请先完成 Phase 0 → pnpm phase:advance
   紧急跳过：git push --no-verify
```

### 4.4 紧急跳过（不推荐）

```bash
git push --no-verify    # 跳过 pre-push hook
```

但 CI 仍然会跑。如果 CI 红了，PR 合并不了。

---

## 五、边界与限制

### 5.1 Phase Gate 能保证什么

| 场景 | 效果 |
|------|------|
| 正常开发流程中跳过 Phase | ❌ 不可能。pre-push 阻断 |
| 忘记完成某个 Phase 的出口 | ❌ 不可能。pre-commit 每次都提醒 |
| 手动删除 hooks 逃逸 | ❌ 下次 `pnpm phase:check` 自动修复 |
| 手动改 .phase 逃逸 | ⚠️ pre-commit 检测到会警告。真正防线在 CI |
| `git push --no-verify` 逃逸 | ⚠️ 客户端拦不住。GitHub Actions CI 兜底 |
| force push 覆盖 main | 🚫 GitHub branch protection 阻止 |
| 完全绕过所有机制（删 .git、换机器、改 CI 文件） | 不可能防。但如果到了这步，已经不是工具问题 |

### 5.2 Phase Gate 不能保证什么

- ❌ 代码质量 — 这是 Code Review 和 lint 的职责
- ❌ 测试覆盖率 — 这是 Vitest 和 CI 的职责
- ❌ 业务逻辑正确性 — 这是测试和人工验收的职责
- ❌ 安全漏洞 — 这是安全审计的职责
- ❌ 阻止恶意开发者 — 任何客户端机制都可以被绕过。最终保证是 GitHub branch protection + 人工 Code Review

### 5.3 与 CI/CD 的关系

| 系统 | 检查什么 | 运行在哪里 |
|------|---------|-----------|
| Phase Gate | Phase 递进正确性（文件/目录/tag） | 客户端 + GitHub Actions |
| CI (lint/build/test) | 代码正确性 | GitHub Actions |
| CD (deploy) | 部署 | GitHub Actions / Vercel |

三者是互补关系，不是替代关系。

---

## 六、GitHub 分支保护设置（必须手动配一次）

这是整个系统的 **最终保证**。没有这步，`git push --no-verify` 可以完全绕过。

### 6.1 操作步骤

1. 打开 GitHub 仓库 → **Settings** → **Branches**
2. 点击 **Add branch protection rule**
3. 填写配置：

| 配置项 | 值 | 说明 |
|--------|-----|------|
| Branch name pattern | `main` | 保护 main 分支 |
| ☑ Require a pull request before merging | ✅ | 不能直接 push，必须走 PR |
| ☑ Require status checks to pass | ✅ | CI 不过不能合并 |
| Status checks: search `phase-gate` | ✅ | Phase Gate CI job 名 |

4. 点击 **Create**

### 6.2 配置后的效果

```
开发者 git push --no-verify → 推到自己的分支 ✅
                             ↓
                         提 PR 到 main
                             ↓
                     GitHub Actions 跑 phase-gate.yml
                             ↓
              ┌─ CI 绿（tag 链完整）→ 可以 merge
              │
              └─ CI 红（缺 tag）→ merge 按钮灰色，合不进去
```

---

## 七、Phase 出口标准详细说明

### 7.1 Phase 0 — 基础设施

**目标**：Express 能启动，MySQL 能连上，8 张表能建。

| # | 检查项 | 验证方式 |
|---|---|---------|
| 0.1 | `server/` 目录存在 + `package.json` + `tsconfig.json` | `test -f` |
| 0.2 | 核心文件就位：`db/client.ts`, `db/schema.ts`, `app.ts`, `index.ts`, `config.ts`, `utils/logger.ts` | `test -f` |
| 0.3 | `.env.example` 模板存在 | `test -f` |
| 0.4 | `server/node_modules` 已安装 | `test -d` |
| 0.5 | `tsc --noEmit` 通过 | tsc 编译检查 |
| 0.6 | DB 连接成功（仅 DB_HOST 已配时检查） | `SELECT 1` |

### 7.2 Phase 1 — 后端核心

**目标**：`POST /api/generate` 能返回 Content DTO。

| 类别 | 检查项 |
|------|-------|
| Auth | `routes/auth.ts`, `middleware/auth.ts` |
| 限流 | `middleware/rate-limit.ts` |
| Repository | 4 个 repo 文件 |
| Provider | `index.ts` + `mock-provider.ts` + 至少 1 个真实 Provider |
| Workflow | 7 个 node 文件 + `index.ts` |
| API | `routes/generate.ts` |
| 编译 | `tsc --noEmit` |
| 冒烟 | `POST /api/generate` 返回 200（需服务运行中） |

### 7.3 Phase 2-4

出口标准待该 Phase 开始时在 `phase-gate.sh` 中补全。

---

## 八、扩展指南

### 8.1 新增检查项（修改现有 Phase）

编辑 `scripts/phase-gate.sh` 中对应 Phase 的 `check` 调用。

```bash
# 在 run_phase_0_checks() 中添加：
check "新增的描述"  test -f "$PROJECT_ROOT/path/to/file"
```

### 8.2 补全 Phase 2/3/4 出口标准

在 `scripts/phase-gate.sh` 中找到 `run_phase_2_checks()` / `run_phase_3_checks()` / `run_phase_4_checks()`，把占位 `return 0` 替换为实际检查。

### 8.3 添加新 Phase

1. 在 `phase-gate.sh` 添加 `run_phase_5_checks()` 函数
2. 更新 PROGRESS.md Phase 划分图和详细拆解
3. 更新本文件

---

## 九、故障排查

### hooks 不触发

```bash
# 检查 hooks 是否存在
ls -la .git/hooks/pre-commit .git/hooks/pre-push

# 手动安装
pnpm install    # postinstall 自动安装

# 或手动
ln -sf ../../scripts/pre-commit-hook.sh .git/hooks/pre-commit
ln -sf ../../scripts/pre-push-hook.sh .git/hooks/pre-push
```

### phase:advance 被拒绝但我觉得完成了

```bash
pnpm phase:check    # 看具体哪个检查 ❌
# 如果是"合理"的失败（如某个文件暂时不需要），去 phase-gate.sh 中注释掉对应 check 行
```

### Phase 已推进但 git push 还报缺 tag

```bash
# 可能 tag 没 push 到远程
git push --tags

# 或手动打 tag
git tag -a phase-0-done -m "Phase 0 出口达标"
```

### CI 红了但本地是绿的

```bash
# 检查本地 tag 是否 push
git push --tags

# 检查 .phase 文件是否已 commit + push
git status
```

---

## 十、对 AI 协作者（Claude/Reasonix）的说明

> 以下规则在 AI 执行任务时同样适用。

1. **开始任何代码工作前**，先跑 `pnpm phase:status` 确认当前 Phase。
2. **不要手动改 `.phase` 文件**。推进 Phase 的唯一入口是 `pnpm phase:advance`。
3. **不要跳过 hooks**。`git commit` 和 `git push` 时让 hooks 正常执行。
4. **出口不达标时不要 push**。修到 `pnpm phase:check` 全部 ✅ 再 push。
5. **每完成一个 Milestone**，更新 `PROGRESS.md` 对应条目状态。
6. **提交信息遵循规范**：`feat:` / `fix:` / `docs:` / `refactor:` / `test:`。
7. **新 Phase 开始时**，如果该 Phase 的出口标准还是占位（`return 0`），先补全出口标准再开始写代码。
