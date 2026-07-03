#!/usr/bin/env bash
# pre-push hook — 双重守卫
# 1. 禁直接推 main（必须走 PR）
# 2. Phase gate — 所有前置 Phase 必须有 tag
# 紧急跳过：git push --no-verify
set -euo pipefail

PROJECT_ROOT="$(git rev-parse --show-toplevel)"
PHASE=$(cat "$PROJECT_ROOT/.phase" 2>/dev/null || echo "0")

# ── 守卫 1：读取 git 传过来的目标 ref ──────────────────────
pushing_to_main=0
while IFS=' ' read -r local_ref local_sha remote_ref remote_sha; do
    case "$remote_ref" in
        refs/heads/main|refs/heads/main$'\r')
            pushing_to_main=1 ;;
    esac
done

if [[ $pushing_to_main -eq 1 ]]; then
    echo ""
    echo "╔══════════════════════════════════════════╗"
    echo "║  🚫 不允许直接 push 到 main 分支        ║"
    echo "╠══════════════════════════════════════════╣"
    echo "║                                          ║"
    echo "║  main 受保护，所有变更必须走 Pull Request ║"
    echo "║                                          ║"
    echo "║  正确流程：                              ║"
    echo "║    git checkout -b feat/xxx              ║"
    echo "║    git push contentFlow feat/xxx          ║"
    echo "║    去 GitHub 开 PR → CI 绿 → merge       ║"
    echo "║                                          ║"
    echo "║  紧急跳过: git push --no-verify          ║"
    echo "╚══════════════════════════════════════════╝"
    echo ""
    exit 1
fi

# ── 守卫 2：Phase gate ─────────────────────────────────────
for ((n=0; n<PHASE; n++)); do
    if ! git tag -l "phase-${n}-done" | grep -q . ; then
        echo ""
        echo "🚫 PUSH 被阻止：Phase $PHASE 进行中，但 Phase $n 尚未标记完成 (tag phase-${n}-done 缺失)。"
        echo "   请先完成 Phase $n → pnpm phase:advance"
        echo "   紧急跳过：git push --no-verify"
        exit 1
    fi
done

echo "✅ Phase gate 检查通过 (Phase $PHASE)"
exit 0
