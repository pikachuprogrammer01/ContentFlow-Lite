#!/usr/bin/env bash
# enforce-phase.sh — 每次 pnpm phase:check 时顺便自检 hooks 还在不在
# 如果 hooks 被删了，重新装上并警告
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# 自检：hooks 还在吗？
missing=0
if [[ ! -f "$PROJECT_ROOT/.git/hooks/pre-commit" ]]; then
    ln -sf ../../scripts/pre-commit-hook.sh "$PROJECT_ROOT/.git/hooks/pre-commit" 2>/dev/null
    echo "⚠️  pre-commit hook 缺失，已自动修复"
    missing=1
fi
if [[ ! -f "$PROJECT_ROOT/.git/hooks/pre-push" ]]; then
    ln -sf ../../scripts/pre-push-hook.sh "$PROJECT_ROOT/.git/hooks/pre-push" 2>/dev/null
    echo "⚠️  pre-push hook 缺失，已自动修复"
    missing=1
fi
if [[ $missing -eq 1 ]]; then
    echo "💡 hooks 已恢复。如果反复丢失，检查是否有工具在清理 .git/hooks/"
fi
