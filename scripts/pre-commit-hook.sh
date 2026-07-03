#!/usr/bin/env bash
# pre-commit hook — 提交前检查
# 软阻止：❌ 时打印警告但不阻断提交（避免紧急修复被卡死）
# 硬阻止由 pre-push hook 负责
set -euo pipefail

PROJECT_ROOT="$(git rev-parse --show-toplevel)"
PHASE=$(cat "$PROJECT_ROOT/.phase" 2>/dev/null || echo "0")

# 检测 .phase 是否被手动篡改（不在 git diff 中检查未跟踪变化）
if git diff --cached --name-only | grep -q "^.phase$"; then
    echo ""
    echo "⚠️  检测到 .phase 文件被手动修改。"
    echo "   请使用 pnpm phase:advance 推进 Phase，不要手动改 .phase。"
    echo "   本次提交仍然允许，但 push 时会被拦截。"
    echo ""
fi

# 跑当前 Phase 检查（仅警告）
if ! bash "$PROJECT_ROOT/scripts/phase-gate.sh" check 2>/dev/null; then
    echo ""
    echo "⚠️  Phase $PHASE 出口检查未通过。可以继续 commit，但 push 会被拦截。"
    echo "   建议: pnpm phase:status 查看待完成项"
    echo ""
fi

exit 0
