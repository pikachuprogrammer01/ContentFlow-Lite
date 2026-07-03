#!/usr/bin/env bash
# pre-push hook — Phase gate enforcement
# 阻止跳过 Phase：所有之前的 Phase 必须有 phase-{N}-done tag
# 紧急跳过：git push --no-verify
set -euo pipefail

PROJECT_ROOT="$(git rev-parse --show-toplevel)"
PHASE=$(cat "$PROJECT_ROOT/.phase" 2>/dev/null || echo "0")

for ((n=0; n<PHASE; n++)); do
    if ! git tag -l "phase-${n}-done" | grep -q . ; then
        echo ""
        echo "🚫 PUSH 被阻止：Phase $PHASE 进行中，但 Phase $n 尚未标记完成 (tag phase-${n}-done 缺失)。"
        echo ""
        echo "   请先完成 Phase $n → pnpm phase:advance"
        echo "   紧急跳过：git push --no-verify"
        exit 1
    fi
done

echo "✅ Phase gate 检查通过 (Phase $PHASE)"
exit 0
