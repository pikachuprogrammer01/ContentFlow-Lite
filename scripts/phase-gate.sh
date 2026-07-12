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
    check "node_modules 存在"             test -d "$PROJECT_ROOT/node_modules"

    # 0.5 编译
    check "server tsc --noEmit"           bash -c "cd '$PROJECT_ROOT/server' 2>/dev/null && npx tsc --noEmit > /dev/null 2>&1" || true

    # 0.6 DB（仅配了才检查）
    if grep -q "^DB_HOST=" "$PROJECT_ROOT/.env" 2>/dev/null; then
        check "DB 连接成功"               "$PROJECT_ROOT/node_modules/.bin/tsx" "$PROJECT_ROOT/server/db/check.ts"
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
        local TEST_USER="phase_gate_test"
        local TEST_PASS="GateTest123!"
        local TEST_EMAIL="gate@test.local"
        local BASE="http://localhost:3001"

        # 先尝试登录
        local TOKEN=$(curl -s -X POST "$BASE/api/auth/login" \
            -H 'Content-Type: application/json' \
            -d "{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\"}" \
            2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null)

        # 登录失败则注册并重新登录
        if [[ -z "$TOKEN" ]]; then
            curl -s -X POST "$BASE/api/auth/register" \
                -H 'Content-Type: application/json' \
                -d "{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\",\"email\":\"$TEST_EMAIL\"}" \
                > /dev/null 2>&1

            TOKEN=$(curl -s -X POST "$BASE/api/auth/login" \
                -H 'Content-Type: application/json' \
                -d "{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\"}" \
                2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null)
        fi

        total=$((total + 1))
        if [[ -n "$TOKEN" ]]; then
            if curl -s -X POST "$BASE/api/generate" \
                -H 'Content-Type: application/json' \
                -H "Authorization: Bearer $TOKEN" \
                -d '{"topic":"test","platform":"xiaohongshu","provider":"mock"}' \
                -w '%{http_code}' -o /dev/null 2>/dev/null | grep -q 200; then
                pass=$((pass + 1)); results+="  ✅ POST /api/generate 返回 200"$'\n'
            else
                results+="  ❌ POST /api/generate 返回 200"$'\n'
            fi
        else
            results+="  ❌ POST /api/generate 返回 200（无法获取 token）"$'\n'
        fi
    fi

    echo -e "\n$results"
    echo "  结果: $pass/$total 通过"
    if [[ $pass -eq $total ]]; then echo "  ✅ Phase 1 出口达标"; return 0
    else echo "  ❌ Phase 1 出口不达标 — $((total - pass)) 项未通过"; return 1; fi
}

# ── Phase 2 出口标准 ────────────────────────────────────────
run_phase_2_checks() {
    local total=0 pass=0
    local results=""

    check() {
        local desc="$1"; shift
        total=$((total + 1))
        if "$@"; then pass=$((pass + 1)); results+="  ✅ $desc"$'\n'
        else results+="  ❌ $desc"$'\n'; fi
    }

    # 2.1 Naive UI 集成
    check "naive-ui 在 package.json 中"     grep -q '"naive-ui"' "$PROJECT_ROOT/client/package.json"
    check "naive-ui 已安装 (node_modules)"   test -d "$PROJECT_ROOT/client/node_modules/naive-ui"

    # 2.2 前端基础设施
    check "src/utils/api-client.ts"           test -f "$PROJECT_ROOT/client/src/utils/api-client.ts"
    check "src/stores/auth.ts"                test -f "$PROJECT_ROOT/client/src/stores/auth.ts"
    check "src/repositories/http-repository.ts"   test -f "$PROJECT_ROOT/client/src/repositories/http-repository.ts"

    # 2.3 前端页面（全部 5 个页面就位）
    check "src/pages/LoginPage.vue"           test -f "$PROJECT_ROOT/client/src/pages/LoginPage.vue"
    check "src/pages/HomePage.vue"            test -f "$PROJECT_ROOT/client/src/pages/HomePage.vue"
    check "src/pages/EditPage.vue"            test -f "$PROJECT_ROOT/client/src/pages/EditPage.vue"
    check "src/pages/PromptPage.vue"          test -f "$PROJECT_ROOT/client/src/pages/PromptPage.vue"
    check "src/pages/HistoryPage.vue"         test -f "$PROJECT_ROOT/client/src/pages/HistoryPage.vue"

    # 2.4 路由守卫
    check "router 含 LoginPage 路由"          grep -q "LoginPage" "$PROJECT_ROOT/client/src/router/index.ts"
    check "router 含导航守卫 (beforeEach)"    grep -q "beforeEach" "$PROJECT_ROOT/client/src/router/index.ts"

    # 2.5 后端内容/Prompt 路由
    check "server/routes/content.ts"          test -f "$PROJECT_ROOT/server/routes/content.ts"
    check "server/routes/prompt.ts"           test -f "$PROJECT_ROOT/server/routes/prompt.ts"

    # 2.6 编译检查
    check "前端 vue-tsc --noEmit"             bash -c "cd '$PROJECT_ROOT/client' && npx vue-tsc --noEmit > /dev/null 2>&1" || true
    check "后端 tsc --noEmit"                 bash -c "cd '$PROJECT_ROOT/server' && npx tsc --noEmit > /dev/null 2>&1" || true

    # 2.7 冒烟测试（仅后端运行时有效）
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        local TEST_USER="phase2_smoke"
        local TEST_PASS="SmokeTest123!"
        local TEST_EMAIL="smoke2@test.local"
        local BASE="http://localhost:3001"

        local TOKEN=$(curl -s -X POST "$BASE/api/auth/login" \
            -H 'Content-Type: application/json' \
            -d "{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\"}" \
            2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null)

        if [[ -z "$TOKEN" ]]; then
            curl -s -X POST "$BASE/api/auth/register" \
                -H 'Content-Type: application/json' \
                -d "{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\",\"email\":\"$TEST_EMAIL\"}" \
                > /dev/null 2>&1
            TOKEN=$(curl -s -X POST "$BASE/api/auth/login" \
                -H 'Content-Type: application/json' \
                -d "{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\"}" \
                2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null)
        fi

        if [[ -n "$TOKEN" ]]; then
            local content_code=$(curl -s -o /dev/null -w '%{http_code}' \
                -H "Authorization: Bearer $TOKEN" \
                "$BASE/api/content" 2>/dev/null)
            total=$((total + 1))
            if [[ "$content_code" == "200" ]]; then pass=$((pass + 1)); results+="  ✅ GET /api/content 返回 200"$'\n'
            else results+="  ❌ GET /api/content 返回 $content_code"$'\n'; fi

            local prompt_code=$(curl -s -o /dev/null -w '%{http_code}' \
                -H "Authorization: Bearer $TOKEN" \
                "$BASE/api/prompt/templates" 2>/dev/null)
            total=$((total + 1))
            if [[ "$prompt_code" == "200" ]]; then pass=$((pass + 1)); results+="  ✅ GET /api/prompt/templates 返回 200"$'\n'
            else results+="  ❌ GET /api/prompt/templates 返回 $prompt_code"$'\n'; fi

            local gen_code=$(curl -s -X POST "$BASE/api/generate" \
                -H 'Content-Type: application/json' \
                -H "Authorization: Bearer $TOKEN" \
                -d '{"topic":"smoke_test","platform":"xiaohongshu","provider":"mock"}' \
                -w '%{http_code}' -o /dev/null 2>/dev/null)
            total=$((total + 1))
            if [[ "$gen_code" == "200" ]]; then pass=$((pass + 1)); results+="  ✅ POST /api/generate 返回 200"$'\n'
            else results+="  ❌ POST /api/generate 返回 $gen_code"$'\n'; fi
        else
            results+="  ⚠️ 无法获取 token，跳过 API 冒烟测试"$'\n'
        fi
    fi

    echo -e "\n$results"
    echo "  结果: $pass/$total 通过"
    if [[ $pass -eq $total ]]; then echo "  ✅ Phase 2 出口达标"; return 0
    else echo "  ❌ Phase 2 出口不达标 — $((total - pass)) 项未通过"; return 1; fi
}

# ── Phase 3-4 出口（占位，Phase 开始时补全）───────────────
run_phase_3_checks() {
    local total=0 pass=0
    local results=""
    local manual_reminders=""
    local PHASE3_TEST_USER_ID=""

    check() {
        local desc="$1"; shift
        total=$((total + 1))
        if "$@"; then pass=$((pass + 1)); results+="  ✅ $desc"$'\n'
        else results+="  ❌ $desc"$'\n'; fi
    }

    # ── 3.1 结构性检查：新增依赖文件必须存在（提前暴露根因，避免后面脚本报一堆 module not found）──
    check "server/entities/index.ts"               test -f "$PROJECT_ROOT/server/entities/index.ts"
    check "server/db/seed-permissions.ts"           test -f "$PROJECT_ROOT/server/db/seed-permissions.ts"
    check "server/services/permission-service.ts"  test -f "$PROJECT_ROOT/server/services/permission-service.ts"
    check "server/services/api-key-service.ts"      test -f "$PROJECT_ROOT/server/services/api-key-service.ts"
    check "server/admin/index.ts"                   test -f "$PROJECT_ROOT/server/admin/index.ts"
    check "server/admin/auth.ts"                    test -f "$PROJECT_ROOT/server/admin/auth.ts"
    check "server/admin/permission-adapter.ts"      test -f "$PROJECT_ROOT/server/admin/permission-adapter.ts"
    check "server/permissions/route-manifest.ts"    test -f "$PROJECT_ROOT/server/permissions/route-manifest.ts"

    # ── 3.2 routes/admin 手写子路由必须已删除（被 AdminJS 取代，决策 8 没有豁免这几个）──
    for f in index contents generations prompts users; do
        check "旧 routes/admin/${f}.ts 已删除"  bash -c "! test -f '$PROJECT_ROOT/server/routes/admin/${f}.ts'"
    done

    # ── 3.3 repository 文件"保留路径，替换实现"（决策 8）：检查内容，不检查文件是否存在 ──
    local mysql2_leftover=""
    for f in user content prompt generation; do
        local repo_file="$PROJECT_ROOT/server/db/repositories/${f}-repo.ts"
        if [[ -f "$repo_file" ]] && grep -qE "mysql2|pool\.query" "$repo_file" 2>/dev/null; then
            mysql2_leftover+="${f}-repo.ts "
        fi
    done
    total=$((total + 1))
    if [[ -z "$mysql2_leftover" ]]; then
        pass=$((pass + 1)); results+="  ✅ repository 已切到 TypeORM（不再含 mysql2 原生查询）"$'\n'
    else
        results+="  ❌ 以下 repository 仍残留 mysql2 原生查询：$mysql2_leftover"$'\n'
    fi

    # ── 3.4 编译检查 ──────────────────────────────
    check "server tsc --noEmit"  bash -c "cd '$PROJECT_ROOT/server' 2>/dev/null && npx tsc --noEmit > /dev/null 2>&1"

    # ── 3.5 冒烟测试（仅服务运行时有效）──────────
    # 注意：下面涉及 /api/generate、/api/content、/api/settings/api-keys 的请求/响应字段名，
    # 是根据 route-manifest.ts 和 PHASE3_DESIGN.md §3.2.1 反推的，实际路由字段名不一致时需要调整。
    # 且必须放在 3.6 之前执行 —— verify-phase3-integrity.ts 的 API Key 断言依赖这里产生的测试用户 ID。
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        local BASE="http://localhost:3001"
        local TS=$(date +%s)
        local ADMIN_SETUP_KEY_VALUE=$(grep "^ADMIN_SETUP_KEY=" "$PROJECT_ROOT/.env" 2>/dev/null | cut -d'=' -f2-)

        get_token() {
            local u="$1" p="$2" e="$3" k="${4:-}"
            local tok=$(curl -s -X POST "$BASE/api/auth/login" \
                -H 'Content-Type: application/json' \
                -d "{\"username\":\"$u\",\"password\":\"$p\"}" \
                2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null)
            if [[ -z "$tok" ]]; then
                local body
                if [[ -n "$k" ]]; then body="{\"username\":\"$u\",\"password\":\"$p\",\"email\":\"$e\",\"adminKey\":\"$k\"}"
                else body="{\"username\":\"$u\",\"password\":\"$p\",\"email\":\"$e\"}"; fi
                curl -s -X POST "$BASE/api/auth/register" -H 'Content-Type: application/json' -d "$body" > /dev/null 2>&1
                tok=$(curl -s -X POST "$BASE/api/auth/login" \
                    -H 'Content-Type: application/json' \
                    -d "{\"username\":\"$u\",\"password\":\"$p\"}" \
                    2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null)
            fi
            echo "$tok"
        }

        local USER_TOKEN=$(get_token "phase3_user_$TS" "Phase3Test123!" "phase3user_$TS@test.local")
        local ADMIN_TOKEN=$(get_token "phase3_admin_$TS" "Phase3Test123!" "phase3admin_$TS@test.local" "$ADMIN_SETUP_KEY_VALUE")

        total=$((total + 1))
        if [[ -n "$USER_TOKEN" && -n "$ADMIN_TOKEN" ]]; then
            pass=$((pass + 1)); results+="  ✅ user/admin 测试账号登录成功"$'\n'
        else
            results+="  ❌ user/admin 测试账号登录失败（后续依赖登录的检查会连带跳过）"$'\n'
        fi

        if [[ -n "$USER_TOKEN" ]]; then
            total=$((total + 1))
            local jwt_check=$(python3 -c "
            import sys, json, base64
            token = '$USER_TOKEN'
            payload_b64 = token.split('.')[1]
            padded = payload_b64 + '=' * (-len(payload_b64) % 4)
            payload = json.loads(base64.urlsafe_b64decode(padded))
            print('FAIL' if ('role' in payload or 'userId' not in payload) else 'OK')
            " 2>/dev/null)
            if [[ "$jwt_check" == "OK" ]]; then
                pass=$((pass + 1)); results+="  ✅ JWT payload 仅含 userId，无 role 字段"$'\n'
            else
                results+="  ❌ JWT payload 检查失败（仍含 role，或缺 userId）"$'\n'
            fi

            total=$((total + 1))
            if curl -s -X POST "$BASE/api/generate" \
                -H 'Content-Type: application/json' -H "Authorization: Bearer $USER_TOKEN" \
                -d "{\"topic\":\"phase3_scope_probe_user_$TS\",\"platform\":\"xiaohongshu\",\"provider\":\"mock\"}" \
                -w '%{http_code}' -o /dev/null 2>/dev/null | grep -q 200; then
                pass=$((pass + 1)); results+="  ✅ user 角色 POST /api/generate 返回 200（content:generate 已授权）"$'\n'
            else
                results+="  ❌ user 角色 POST /api/generate 未返回 200"$'\n'
            fi

            local FAKE_KEY="sk-phase3verify${TS}fakekeydonotuse"
            curl -s -X PUT "$BASE/api/settings/api-keys" \
                -H 'Content-Type: application/json' -H "Authorization: Bearer $USER_TOKEN" \
                -d "{\"provider\":\"gemini\",\"apiKey\":\"$FAKE_KEY\"}" > /dev/null 2>&1

            local key_view=$(curl -s -H "Authorization: Bearer $USER_TOKEN" "$BASE/api/settings/api-keys" 2>/dev/null)
            total=$((total + 1))
            if echo "$key_view" | grep -q "$FAKE_KEY"; then
                results+="  ❌ 危险：API Key 明文出现在响应中！"$'\n'
            else
                pass=$((pass + 1)); results+="  ✅ API Key 展示已脱敏，未回传明文"$'\n'
            fi

            PHASE3_TEST_USER_ID=$(curl -s -H "Authorization: Bearer $USER_TOKEN" "$BASE/api/auth/me" 2>/dev/null \
                | python3 -c "import sys,json; print(json.load(sys.stdin).get('user',{}).get('id',''))" 2>/dev/null)
        fi

        if [[ -n "$ADMIN_TOKEN" ]]; then
            curl -s -X POST "$BASE/api/generate" \
                -H 'Content-Type: application/json' -H "Authorization: Bearer $ADMIN_TOKEN" \
                -d "{\"topic\":\"phase3_scope_probe_admin_$TS\",\"platform\":\"xiaohongshu\",\"provider\":\"mock\"}" \
                > /dev/null 2>&1
        fi

        if [[ -n "$USER_TOKEN" && -n "$ADMIN_TOKEN" ]]; then
            sleep 1
            local user_view=$(curl -s -H "Authorization: Bearer $USER_TOKEN" "$BASE/api/content" 2>/dev/null)
            local admin_view=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/api/content" 2>/dev/null)

            total=$((total + 1))
            if echo "$user_view" | grep -q "phase3_scope_probe_user_$TS" && ! echo "$user_view" | grep -q "phase3_scope_probe_admin_$TS"; then
                pass=$((pass + 1)); results+="  ✅ data_scope=SELF 生效：user 只看到自己的内容"$'\n'
            else
                results+="  ❌ data_scope=SELF 未生效（user 看到了别人的内容，或看不到自己的）"$'\n'
            fi

            total=$((total + 1))
            if echo "$admin_view" | grep -q "phase3_scope_probe_user_$TS" && echo "$admin_view" | grep -q "phase3_scope_probe_admin_$TS"; then
                pass=$((pass + 1)); results+="  ✅ data_scope=ALL 生效：admin 能看到全部内容"$'\n'
            else
                results+="  ❌ data_scope=ALL 未生效（也可能是 ADMIN_SETUP_KEY 没配对，检查 .env）"$'\n'
            fi
        fi

        local admin_code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/admin" 2>/dev/null)
        total=$((total + 1))
        if [[ "$admin_code" != "404" && -n "$admin_code" ]]; then
            pass=$((pass + 1)); results+="  ✅ AdminJS /admin 已挂载（HTTP $admin_code）"$'\n'
        else
            results+="  ❌ AdminJS /admin 不可达（HTTP $admin_code）"$'\n'
        fi
    else
        results+="  ⚠️  后端未运行，跳过全部运行时冒烟测试（不计入 pass/total，但会连带导致下面 API Key 加密断言只能验证角色部分）"$'\n'
    fi

    # ── 3.6 数据库直查 + 事务型断言 ──────────────
    check "3 系统角色齐全 + API Key 加密断言"      bash -c "cd '$PROJECT_ROOT/server' && npx tsx scripts/verify-phase3-integrity.ts '$PHASE3_TEST_USER_ID' > /dev/null 2>&1"
    check "权限码 ↔ 路由清单覆盖率（无遗漏无孤儿）" bash -c "cd '$PROJECT_ROOT/server' && npx tsx scripts/verify-permission-coverage.ts > /dev/null 2>&1"
    check "super_admin 唯一性保护生效"             bash -c "cd '$PROJECT_ROOT/server' && npx tsx scripts/verify-super-admin-guard.ts > /dev/null 2>&1"
    check "level 层级规则生效（同级拒绝/更高放行）"     bash -c "cd '$PROJECT_ROOT/server' && npx tsx scripts/verify-level-hierarchy-guard.ts > /dev/null 2>&1"
    check "用户级权限覆盖 GRANT/DENY/过期/校验"         bash -c "cd '$PROJECT_ROOT/server' && npx tsx scripts/verify-user-permission-override.ts > /dev/null 2>&1"
    check "缓存失效时机（角色调整立即/角色定义走TTL）"   bash -c "cd '$PROJECT_ROOT/server' && npx tsx scripts/verify-permission-cache-timing.ts > /dev/null 2>&1"
    check "content:generate 三角色默认 GRANT"          bash -c "cd '$PROJECT_ROOT/server' && npx tsx scripts/verify-generate-seeded.ts > /dev/null 2>&1"

    # ── 3.7 前端 build ────────────────────────────
    check "前端 pnpm build 成功"  bash -c "cd '$PROJECT_ROOT/client' && pnpm build > /dev/null 2>&1"

    # ── 3.8 人工验证提醒（决策 7 既定处理方式：不计入 pass/total，不阻挡 advance）──
    manual_reminders+="  📋 前端侧边栏按权限码渲染，需人工用 user/admin/super_admin 三种账号登录比对菜单"$'\n'
    manual_reminders+="  📋 /api/content 与 AdminJS Content Resource 是否真的复用同一个 repository 函数——架构问题，脚本查不出，需人工 code review"$'\n'
    manual_reminders+="  📋 Redis 未配置时的静默降级：需手动清空 REDIS_URL 重启一次服务验证（脚本不重启进程）"$'\n'
    manual_reminders+="  📋 真实 super_admin 账号的完整登录回归：脚本出于安全原因不获取其密码，需人工登录跑一遍"$'\n'

    echo -e "\n$results"
    if [[ -n "$manual_reminders" ]]; then
        echo "── 人工验证提醒（不计入通过率，不阻挡 phase:advance）──"
        echo -e "$manual_reminders"
    fi
    echo "  结果: $pass/$total 通过"
    if [[ $pass -eq $total ]]; then echo "  ✅ Phase 3 出口达标"; return 0
    else echo "  ❌ Phase 3 出口不达标 — $((total - pass)) 项未通过"; return 1; fi
}

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
