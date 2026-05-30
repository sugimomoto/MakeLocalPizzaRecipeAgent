#!/usr/bin/env bash
# verify-oven-profile.sh — Slice 8 機材プロファイルが実 LLM 呼び出しに反映されるか確認する。
#
# 使い方:
#   # ローカル (Python agent 直接):
#   AGENT_URL=http://localhost:8080 ./scripts/verify-oven-profile.sh
#
#   # 本番 (Cloud Run の agent 内部 URL or Next.js 経由):
#   AGENT_URL=https://mlpr-agent-xxxxx-an.a.run.app ./scripts/verify-oven-profile.sh
#
# 確認項目:
#   1. ENRO プロファイルで生成すると bakingTemp が 400〜450°C 範囲に入る
#   2. 家庭用オーブンプロファイルで生成すると bakingTemp が 250〜300°C 範囲に入る
#
# 注意:
#   - Vertex AI を叩くので 1 回 = 約 $0.005 (Gemini Flash の API 課金 + Imagen 1 枚)
#   - 揺らぎを見るため各プロファイル 2 回実行 (= 計 4 回 ≒ $0.02 程度)
#   - Imagen は不要なので可能なら IMAGEN_FAKE_URL を立ててコストを抑える

set -euo pipefail

AGENT_URL="${AGENT_URL:-http://localhost:8080}"
LOCALE_ID="${LOCALE_ID:-miyagi}"

# テスト用候補 (固定)。実際の候補生成を経由しないので、Slice 2 出力相当のスナップショットを直書き
CANDIDATE_JSON='{
  "candidateId": "verify-slice8-001",
  "strategy": "exploit",
  "title": "せりと牡蠣の春一枚",
  "concept": "ほろ苦さとミルキーさの王道組合せ",
  "keyIngredients": ["せり", "牡蠣", "モッツァレラ"],
  "sceneTags": ["週末家族", "ワインに合う"],
  "why": "宮城らしい組合せを王道で纏める"
}'

run_one() {
  local profile_id="$1"
  local expected_min="$2"
  local expected_max="$3"
  local label="$4"

  echo "─── [${label}] profile=${profile_id} (expected ${expected_min}-${expected_max}°C) ───"

  local body
  body=$(jq -n \
    --arg localeId "$LOCALE_ID" \
    --argjson candidate "$CANDIDATE_JSON" \
    --arg ovenProfile "$profile_id" \
    '{
      localeId: $localeId,
      ingredients: ["miyagi-seri", "miyagi-oyster"],
      candidate: $candidate,
      ovenProfile: $ovenProfile
    }')

  local raw
  raw=$(curl -sS -X POST \
    -H "content-type: application/json" \
    -d "$body" \
    "${AGENT_URL}/agent/recipes/verify-slice8-001")

  # NDJSON から recipe.meta イベントを拾い、bakingTemp 値を取り出す
  local baking_temp
  baking_temp=$(echo "$raw" \
    | grep '"type":"recipe.meta"' \
    | head -1 \
    | jq -r '.meta.bakingTemp // empty')

  if [ -z "$baking_temp" ]; then
    echo "  ❌ recipe.meta イベントが見つかりません (生成失敗の可能性)"
    echo "$raw" | head -5
    return 1
  fi

  # "420°C" → 420
  local numeric
  numeric=$(echo "$baking_temp" | sed -E 's/[^0-9]//g' | head -c 3)

  if [ -z "$numeric" ]; then
    echo "  ❌ bakingTemp='$baking_temp' から数値を抽出できません"
    return 1
  fi

  if [ "$numeric" -ge "$expected_min" ] && [ "$numeric" -le "$expected_max" ]; then
    echo "  ✅ bakingTemp=${baking_temp} → ${numeric}°C (範囲内)"
    return 0
  else
    echo "  ⚠️  bakingTemp=${baking_temp} → ${numeric}°C (期待 ${expected_min}-${expected_max}°C から外れ)"
    return 1
  fi
}

echo "🔍 Slice 8 oven profile verification against ${AGENT_URL}"
echo

failures=0

# ENRO は 400-450°C ± 多少の揺らぎを許容して 380-470°C で見る
run_one "enro_450c_90s" 380 470 "ENRO #1" || failures=$((failures + 1))
sleep 1
run_one "enro_450c_90s" 380 470 "ENRO #2" || failures=$((failures + 1))
sleep 1

# 家庭用オーブンは 250-300°C ± 揺らぎで 230-320°C
run_one "home_oven_280c_10m" 230 320 "HOME #1" || failures=$((failures + 1))
sleep 1
run_one "home_oven_280c_10m" 230 320 "HOME #2" || failures=$((failures + 1))

echo
if [ "$failures" -eq 0 ]; then
  echo "✅ 4/4 範囲内。Slice 8 のプロンプト統合は機能している。"
  exit 0
else
  echo "⚠️  ${failures}/4 が期待範囲外。prompt_directive の指示を強化するか、許容範囲を再検討。"
  exit 1
fi
