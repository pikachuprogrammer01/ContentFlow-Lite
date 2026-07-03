#!/usr/bin/env bash
# pre-push hook — Phase gate enforcement
#
# 规则：
#   - 如果 .phase 中显示的不是最新 Phase 并且该 Phase 还没有 phase-{N}-done tag，
#     阻止 push，提示先完成当前 Phase
#   - 不能跳过 Phase。Phase 3 时不能有 Phase 1 的 ❌ 项未完成（通过 phase-{N}-done tag 判断）
#
# 跳过（仅限紧急情况）：git push --no-verify

set -euo pipefail

PROJECT_ROOT="$(git rev-parse --show-toplevel)"
PHASE=$(cat "$PROJECT_ROOT/.phase" 2>/dev/null || echo "0")

# 检查所有之前的 Phase 都已完成（有 tag）
for n in $(seq 0 $((PHASE - 1))); do
    if ! git tag -l "phase-$n-done" | grep -q . ; then
        echo ""
        echo "🚫 PUSH 被阻止：Phase $PHASE 进行中，但 Phase $n 尚未标记完成 (tag phase-$n-done 缺失)。"
        echo ""
        echo "   请先完成 Phase $n → pnpm phase:advance，或如为初始状态，运行："
        echo "     git tag -a phase-0-done -m 'init'  # Phase 0 初始标记"
        echo ""
        echo "   紧急跳过：git push --no-verify"
        exit 1
    fi
done

echo "✅ Phase gate 检查通过 (Phase $PHASE)"
exit 0
