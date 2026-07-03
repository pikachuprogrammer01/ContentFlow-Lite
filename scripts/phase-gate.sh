#!/usr/bin/env bash
# phase-gate.sh — ContentFlow Lite 硬指标推进系统
#
# 用法：
#   pnpm phase:check    → 校验当前 Phase 出口是否达标
#   pnpm phase:advance  → 校验达标后进下一 Phase
#   pnpm phase:status   → 查看当前 Phase + 待完成任务数
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PHASE_FILE="$PROJECT_ROOT/.phase"

current_phase() {
    if [[ -f "$PHASE_FILE" ]]; then cat "$PHASE_FILE"; else echo "0"; fi
}

PHASE=$(current_phase)

# 自检 hooks 完整性
bash "$PROJECT_ROOT/scripts/enforce-phase.sh" 2>/dev/null || true

# ── Phase 0 出口标准 ────────────────────────────────────────
run_phase_0_checks() {
    local total=0 pass=0
    local results=""

    check() {
        local desc="$1"; shift
        total=$((total + 1))
        if "$@"; then
            pass=$((pass + 1))
            results+="  ✅ $desc"$'\n'
        else
            results+="  ❌ $desc"$'\n'
        fi
    }

    # 0.1 目录
    check "server/ 目录存在"              test -d "$PROJECT_ROOT/server"
    check "server/package.json"           test -f "$PROJECT_ROOT/server/package.json"
    check "server/tsconfig.json"          test -f "$PROJECT_ROOT/server/tsconfig.json"

    # 0.2 核心文件
    check "server/db/client.ts"           test -f "$PROJECT_ROOT/server/db/client.ts"
    check "server/db/schema.ts"           test -f "$PROJECT_ROOT/server/db/schema.ts"
    check "server/app.ts"                 test -f "$PROJECT_ROOT/server/app.ts"
    check "server/index.ts"               test -f "$PROJECT_ROOT/server/index.ts"
    check "server/config.ts"              test -f "$PROJECT_ROOT/server/config.ts"
    check "server/utils/logger.ts"        test -f "$PROJECT_ROOT/server/utils/logger.ts"

    # 0.3 .env 模板
    check ".env.example 存在"             test -f "$PROJECT_ROOT/.env.example"

    # 0.4 依赖
    check "server/node_modules 存在"      test -d "$PROJECT_ROOT/server/node_modules"

    # 0.5 编译
    check "server tsc --noEmit"           bash -c "cd '$PROJECT_ROOT/server' 2>/dev/null && npx tsc --noEmit > /dev/null 2>&1" || true

    # 0.6 DB（仅配了才检查）
    if grep -q "^DB_HOST=" "$PROJECT_ROOT/.env" 2>/dev/null; then
        check "DB 连接成功"               bash -c "node -e '
            const{createPool}=eval(\"require\")(\"'$PROJECT_ROOT/server/dist/db/client.js'\");
            createPool().query(\"SELECT 1\").then(()=>process.exit(0)).catch(()=>process.exit(1));
        '" 2>/dev/null
    fi

    echo -e "\n$results"
    echo "  结果: $pass/$total 通过"
    if [[ $pass -eq $total ]]; then echo "  ✅ Phase 0 出口达标"; return 0
    else echo "  ❌ Phase 0 出口不达标 — $((total - pass)) 项未通过"; return 1; fi
}

# ── Phase 1 出口标准 ────────────────────────────────────────
run_phase_1_checks() {
    local total=0 pass=0
    local results=""

    check() {
        local desc="$1"; shift
        total=$((total + 1))
        if "$@"; then pass=$((pass + 1)); results+="  ✅ $desc"$'\n'
        else results+="  ❌ $desc"$'\n'; fi
    }

    check "server/routes/auth.ts"             test -f "$PROJECT_ROOT/server/routes/auth.ts"
    check "server/middleware/auth.ts"         test -f "$PROJECT_ROOT/server/middleware/auth.ts"
    check "server/middleware/rate-limit.ts"   test -f "$PROJECT_ROOT/server/middleware/rate-limit.ts"
    check "server/db/repositories/user-repo.ts"       test -f "$PROJECT_ROOT/server/db/repositories/user-repo.ts"
    check "server/db/repositories/content-repo.ts"    test -f "$PROJECT_ROOT/server/db/repositories/content-repo.ts"
    check "server/db/repositories/prompt-repo.ts"     test -f "$PROJECT_ROOT/server/db/repositories/prompt-repo.ts"
    check "server/db/repositories/generation-repo.ts" test -f "$PROJECT_ROOT/server/db/repositories/generation-repo.ts"
    check "server/providers/index.ts"           test -f "$PROJECT_ROOT/server/providers/index.ts"
    check "server/providers/mock-provider.ts"   test -f "$PROJECT_ROOT/server/providers/mock-provider.ts"

    local provider_count=0
    for f in gemini deepseek siliconflow tongyi; do
        test -f "$PROJECT_ROOT/server/providers/${f}-provider.ts" && provider_count=$((provider_count + 1))
    done
    total=$((total + 1))
    if [[ $provider_count -ge 1 ]]; then pass=$((pass + 1)); results+="  ✅ 至少 1 个真实 Provider ($provider_count 个)"$'\n'
    else results+="  ❌ 至少 1 个真实 Provider (0 个)"$'\n'; fi

    for node in input prompt provider parse validate dto output; do
        check "server/workflow/nodes/${node}.ts"  test -f "$PROJECT_ROOT/server/workflow/nodes/${node}.ts"
    done
    check "server/workflow/index.ts"              test -f "$PROJECT_ROOT/server/workflow/index.ts"
    check "server/routes/generate.ts"             test -f "$PROJECT_ROOT/server/routes/generate.ts"
    check "server tsc --noEmit"                   bash -c "cd '$PROJECT_ROOT/server' 2>/dev/null && npx tsc --noEmit > /dev/null 2>&1" || true

    # curl 冒烟（服务运行时有效）
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        total=$((total + 1))
        if curl -s -X POST http://localhost:3001/api/generate \
            -H 'Content-Type: application/json' \
            -d '{"topic":"test","platform":"xiaohongshu","provider":"mock"}' \
            -w '%{http_code}' -o /dev/null 2>/dev/null | grep -q 200; then
            pass=$((pass + 1)); results+="  ✅ POST /api/generate 返回 200"$'\n'
        else
            results+="  ❌ POST /api/generate 返回 200"$'\n'
        fi
    fi

    echo -e "\n$results"
    echo "  结果: $pass/$total 通过"
    if [[ $pass -eq $total ]]; then echo "  ✅ Phase 1 出口达标"; return 0
    else echo "  ❌ Phase 1 出口不达标 — $((total - pass)) 项未通过"; return 1; fi
}

# ── Phase 2-4 出口（占位，Phase 开始时补全）───────────────
run_phase_2_checks() { echo "⚠️  Phase 2 出口检查尚未定义（待 Phase 2 开始时补全）"; return 0; }
run_phase_3_checks() { echo "⚠️  Phase 3 出口检查尚未定义（待 Phase 3 开始时补全）"; return 0; }
run_phase_4_checks() { echo "⚠️  Phase 4 出口检查尚未定义（待 Phase 4 开始时补全）"; return 0; }

# ── 入口 ──────────────────────────────────────────────────────
cmd="${1:-status}"

case "$cmd" in
    check|status)
        echo "🔍 当前 Phase: $PHASE"
        "run_phase_${PHASE}_checks" || true
        ;;

    advance)
        echo "🔍 当前 Phase: $PHASE"
        if ! "run_phase_${PHASE}_checks"; then
            echo ""
            echo "🚫 未达到 Phase $PHASE 出口标准，不允许推进。"
            echo "   请完成上方的 ❌ 项后再试。"
            exit 1
        fi

        NEXT=$((PHASE + 1))
        echo ""
        echo "正在进入 Phase $NEXT ..."

        echo "$NEXT" > "$PHASE_FILE"
        echo "✅ .phase → $NEXT"

        git -C "$PROJECT_ROOT" tag -a "phase-${PHASE}-done" -m "Phase $PHASE 出口达标" 2>/dev/null || true
        echo "✅ git tag: phase-${PHASE}-done"

        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━"
        echo "  现在进入 Phase $NEXT"
        echo "━━━━━━━━━━━━━━━━━━━━━━"
        ;;

    *)
        echo "用法: pnpm phase:<check|advance|status>"
        ;;
esac
