#!/usr/bin/env bash
# phase-gate.sh — ContentFlow Lite 硬指标推进系统
#
# 禁止手动改 .phase 文件。进下一 Phase 唯一入口：./scripts/phase-gate.sh advance
#
# 用法：
#   pnpm phase:check    → 校验当前 Phase 出口是否达标
#   pnpm phase:advance  → 校验达标后进下一 Phase（写 .phase + git tag）
#   pnpm phase:status   → 查看当前 Phase + 待完成任务数

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PHASE_FILE="$PROJECT_ROOT/.phase"

# ── 当前 Phase ──────────────────────────────────────────────
current_phase() {
    if [[ -f "$PHASE_FILE" ]]; then
        cat "$PHASE_FILE"
    else
        echo "0"
    fi
}

PHASE=$(current_phase)

# ── Phase 0 出口标准 ────────────────────────────────────────
check_phase_0() {
    local failed=0

    check() {
        local desc="$1"; shift
        if "$@"; then
            echo "  ✅ $desc"
        else
            echo "  ❌ $desc"
            failed=1
        fi
    }

    echo ""
    echo "━━━ Phase 0 出口检查 ━━━"
    echo ""

    # 0.1 目录结构
    check "server/ 目录存在"              test -d "$PROJECT_ROOT/server"
    check "server/package.json 存在"      test -f "$PROJECT_ROOT/server/package.json"
    check "server/tsconfig.json 存在"     test -f "$PROJECT_ROOT/server/tsconfig.json"

    # 0.2 核心文件
    check "server/db/client.ts"           test -f "$PROJECT_ROOT/server/db/client.ts"
    check "server/db/schema.ts"           test -f "$PROJECT_ROOT/server/db/schema.ts"
    check "server/app.ts"                 test -f "$PROJECT_ROOT/server/app.ts"
    check "server/index.ts"               test -f "$PROJECT_ROOT/server/index.ts"
    check "server/config.ts"              test -f "$PROJECT_ROOT/server/config.ts"
    check "server/utils/logger.ts"        test -f "$PROJECT_ROOT/server/utils/logger.ts"

    # 0.3 .env 模板
    check ".env.example 存在"             test -f "$PROJECT_ROOT/.env.example"

    # 0.4 依赖安装
    check "server/node_modules 存在"      test -d "$PROJECT_ROOT/server/node_modules"

    # 0.5 TypeScript 编译
    check "server tsc --noEmit 通过"      bash -c "cd $PROJECT_ROOT/server && npx tsc --noEmit > /dev/null 2>&1"

    # 0.6 数据库连接（仅检查 .env 已配才跑）
    if [[ -n "${DB_HOST:-}" ]]; then
        check "DB 连接成功"               bash -c "cd $PROJECT_ROOT/server && node -e \"
            const { createPool } = require('./db/client');
            const p = createPool();
            p.query('SELECT 1').then(() => { p.end(); process.exit(0); }).catch(() => process.exit(1));
        \" 2>/dev/null"
    else
        echo "  ⏭️  DB 连接跳过（DB_HOST 未配）"
    fi

    echo ""
    if [[ $failed -eq 0 ]]; then
        echo "✅ Phase 0 出口达标"
    else
        echo "❌ Phase 0 出口不达标 — $failed 项未通过"
    fi
    return $failed
}

# ── Phase 1 出口标准（预留）─────────────────────────────────
check_phase_1() {
    local failed=0

    check() {
        local desc="$1"; shift
        if "$@"; then
            echo "  ✅ $desc"
        else
            echo "  ❌ $desc"
            failed=1
        fi
    }

    echo ""
    echo "━━━ Phase 1 出口检查 ━━━"
    echo ""

    # Auth
    check "server/routes/auth.ts"             test -f "$PROJECT_ROOT/server/routes/auth.ts"
    check "server/middleware/auth.ts"         test -f "$PROJECT_ROOT/server/middleware/auth.ts"
    check "server/middleware/rate-limit.ts"   test -f "$PROJECT_ROOT/server/middleware/rate-limit.ts"

    # Repositories
    check "server/db/repositories/user-repo.ts"       test -f "$PROJECT_ROOT/server/db/repositories/user-repo.ts"
    check "server/db/repositories/content-repo.ts"    test -f "$PROJECT_ROOT/server/db/repositories/content-repo.ts"
    check "server/db/repositories/prompt-repo.ts"     test -f "$PROJECT_ROOT/server/db/repositories/prompt-repo.ts"
    check "server/db/repositories/generation-repo.ts" test -f "$PROJECT_ROOT/server/db/repositories/generation-repo.ts"

    # Providers (至少 Mock + 1 个真实)
    check "server/providers/index.ts"           test -f "$PROJECT_ROOT/server/providers/index.ts"
    check "server/providers/mock-provider.ts"   test -f "$PROJECT_ROOT/server/providers/mock-provider.ts"
    check "至少 1 个真实 Provider"              bash -c "
        ls $PROJECT_ROOT/server/providers/gemini-provider.ts \
           $PROJECT_ROOT/server/providers/deepseek-provider.ts \
           $PROJECT_ROOT/server/providers/siliconflow-provider.ts \
           $PROJECT_ROOT/server/providers/tongyi-provider.ts 2>/dev/null | head -1 | grep -q ."

    # Workflow 7 节点
    for node in input prompt provider parse validate dto output; do
        check "server/workflow/nodes/${node}.ts"  test -f "$PROJECT_ROOT/server/workflow/nodes/${node}.ts"
    done
    check "server/workflow/index.ts"              test -f "$PROJECT_ROOT/server/workflow/index.ts"

    # API 生成路由
    check "server/routes/generate.ts"             test -f "$PROJECT_ROOT/server/routes/generate.ts"

    # 编译
    check "server tsc --noEmit 通过"              bash -c "cd $PROJECT_ROOT/server && npx tsc --noEmit > /dev/null 2>&1"

    # curl 冒烟测试（仅服务运行时有效）
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        check "POST /api/generate 返回 200"       bash -c "
            curl -s -X POST http://localhost:3001/api/generate \
              -H 'Content-Type: application/json' \
              -d '{\"topic\":\"test\",\"platform\":\"xiaohongshu\",\"provider\":\"mock\"}' \
              -w '%{http_code}' -o /dev/null | grep -q 200"
    else
        echo "  ⏭️  API 测试跳过（服务未运行）"
    fi

    echo ""
    if [[ $failed -eq 0 ]]; then
        echo "✅ Phase 1 出口达标"
    else
        echo "❌ Phase 1 出口不达标 — $failed 项未通过"
    fi
    return $failed
}

# ── Phase 2-4 出口标准（占位，后续细化）─────────────────────
check_phase_2() { echo "⚠️  Phase 2 检查尚未定义（待 Phase 2 开始时补全）"; return 0; }
check_phase_3() { echo "⚠️  Phase 3 检查尚未定义（待 Phase 3 开始时补全）"; return 0; }
check_phase_4() { echo "⚠️  Phase 4 检查尚未定义（待 Phase 4 开始时补全）"; return 0; }

# ── 入口 ──────────────────────────────────────────────────────

cmd="${1:-status}"

case "$cmd" in
    check)
        echo "🔍 当前 Phase: $PHASE"
        "check_phase_$PHASE"
        ;;

    advance)
        echo "🔍 当前 Phase: $PHASE"

        # 本 Phase 必须先达标
        if ! "check_phase_$PHASE"; then
            echo ""
            echo "🚫 未达到 Phase $PHASE 出口标准，不允许推进。"
            echo "   请完成上方的 ❌ 项后再试。"
            exit 1
        fi

        # 目标 Phase
        NEXT=$((PHASE + 1))
        echo ""
        echo "正在进入 Phase $NEXT ..."

        # 写 .phase
        echo "$NEXT" > "$PHASE_FILE"
        echo "✅ .phase → $NEXT"

        # 子 Phase 需要初始化目录（如果不存在）
        if [[ $NEXT -eq 1 ]]; then
            mkdir -p "$PROJECT_ROOT/server/"{routes,middleware,db/repositories,workflow/nodes,providers,admin,utils}
            echo "✅ server/ 子目录已确保存在"
        fi

        # git tag
        git -C "$PROJECT_ROOT" tag -a "phase-$PHASE-done" -m "Phase $PHASE 出口达标"
        echo "✅ git tag: phase-$PHASE-done"

        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━"
        echo "  现在进入 Phase $NEXT"
        echo "━━━━━━━━━━━━━━━━━━━━━━"
        ;;

    status)
        echo "📌 当前 Phase: $PHASE"

        # 统计本 Phase 任务完成数
        echo ""
        echo "Phase $PHASE 出口检查摘要:"
        "check_phase_$PHASE" 2>/dev/null || true
        ;;

    *)
        echo "用法: pnpm phase:<check|advance|status>"
        echo "  check    — 校验当前 Phase 出口标准"
        echo "  advance  — 达标后进入下一 Phase"
        echo "  status   — 查看当前进度"
        ;;
esac
