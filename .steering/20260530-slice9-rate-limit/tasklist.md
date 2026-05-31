# Slice 9 タスクリスト — アプリ層レートリミット

> 対応 design: [design.md](./design.md) v1.0
> 関連 Issue: [#2](https://github.com/sugimomoto/MakeLocalPizzaRecipeAgent/issues/2)

---

## Phase 0: Firebase Admin SDK 導入

> 2026-05-30 追加: 実装着手時に「現 repo は client-side Firestore のみ」と判明。
> 詳細は [design.md §0.1](./design.md) 参照。

- [ ] T0-1: `pnpm add firebase-admin` で依存追加
- [ ] T0-2: `src/lib/firebase/admin.ts` 新規。`getAdminFirestore()` を `cert()` 不使用で ADC 経由初期化 (Cloud Run の attached SA で動く)
- [ ] T0-3: ADC が無いローカル / Vitest 環境では throw して **Memory store にフォールバック**する経路を保証 (store selector で吸収)
- [ ] T0-4: `next.config.ts` の `serverExternalPackages` に `firebase-admin` を追加 (webpack バンドル回避、instrumentation.ts と同じ理由)
- [ ] T0-5: ローカル `pnpm tsc --noEmit` + `pnpm exec eslint .` 緑確認

---

## Phase 1: ドメイン型 + 定数 + key 抽出

- [ ] T1-1: `src/lib/rate-limit/types.ts` 新規。`RateLimitRouteKey` / `RateLimitKey` / `RateLimitDecision` / `TryConsumeInput`
- [ ] T1-2: `src/lib/rate-limit/limits.ts` 新規。`RATE_LIMITS` (3 route の数値) + `LIMIT_WINDOW_SECONDS = 3600`
- [ ] T1-3: `src/lib/rate-limit/bucket.ts` 新規。`hourBucket(now)` / `secondsUntilNextHour(now)` / `buildDocId` / `routeShortKey`
- [ ] T1-4: `src/lib/rate-limit/bucket.test.ts` 新規。境界跨ぎ / UTC / sanitize
- [ ] T1-5: `src/lib/rate-limit/key.ts` 新規。`resolveRateLimitKey(request, subject)` + `extractIp` + `keyValueOf`
- [ ] T1-6: `src/lib/rate-limit/key.test.ts` 新規。優先順位 (auth > guest > ip > anonymous) / XFF パース

---

## Phase 2: Store 実装 (Memory + Firestore)

- [ ] T2-1: `src/lib/rate-limit/store.ts` 新規。`RateLimitStore` interface + `MemoryRateLimitStore` + `FirestoreRateLimitStore` + `getRateLimitStore()` selector
- [ ] T2-2: `src/lib/rate-limit/store.test.ts` 新規 (Memory のみカバー)。連続 inc / 上限 / 別 bucket / 別 key / 別 route / リセット

> Firestore Store の単体テストは emulator が必要で重いため、middleware 統合テストで代替。

---

## Phase 3: middleware (`withRateLimit`)

- [ ] T3-1: `src/lib/http/with-auth.ts` 改修。`AuthedRequestContext` に `rateLimitRemaining?: number` を追加
- [ ] T3-2: `src/lib/http/with-rate-limit.ts` 新規。`withRateLimit({...}, handler)` HOF
- [ ] T3-3: `src/lib/http/with-rate-limit.test.ts` 新規。429 レスポンス形 / Retry-After / X-RateLimit-* ヘッダ / 既存ハンドラ pass-through / Memory store inject
- [ ] T3-4: 429 時に Cloud Logging へ WARNING ログを出す処理 (既存 logger 利用)

---

## Phase 4: route handler 統合

- [ ] T4-1: `src/lib/rate-limit/toast.ts` 新規。Toast 文言ヘルパ (詳細 / 候補 / reroll の 3 種類)
- [ ] T4-2: `app/api/recipes/[candidateId]/route.ts` 改修。`withRateLimit({ limit: 5, routeKey: '/api/recipes/[candidateId]' }, ...)` 適用
- [ ] T4-3: `app/api/quicktap/sessions/route.ts` 改修。`limit: 10` 適用
- [ ] T4-4: `app/api/quicktap/sessions/[id]/reroll/route.ts` 改修 (パス要確認)。`limit: 10` 適用
- [ ] T4-5: route handler tests 改修。Memory store を inject して 429 ケース 1 件ずつ追加 (3 route)

---

## Phase 5: クライアント側 429 ハンドリング

- [ ] T5-1: `src/hooks/use-recipe-detail-stream.ts` 改修。fetch 直後で 429 check → `useToast` warning + dispatch error
- [ ] T5-2: `src/hooks/use-recipe-detail-stream.test.tsx` 改修。429 ケース追加
- [ ] T5-3: `src/hooks/use-quicktap-stream.ts` 改修。同パターン
- [ ] T5-4: `src/hooks/use-quicktap-stream.test.tsx` 改修。429 ケース追加
- [ ] T5-5: reroll 呼び出し箇所 (`app/candidates/[sessionId]/_components/CandidatesClient.tsx` 等) 改修。429 catch → Toast

---

## Phase 6: Firestore Rules + デプロイオペ

- [ ] T6-1: `firestore.rules` に `match /rate_limits/{docId} { allow read, write: if false; }` 追記
- [ ] T6-2: rules テスト (`tests/firestore-rules/*` があるなら) に rate_limits の reject ケース追加
- [ ] T6-3: README or scripts に「デプロイ後の TTL 設定コマンド」のメモを残す (gcloud コマンド 1 行)

---

## Phase 7: 検証

- [ ] T7-1: `pnpm tsc --noEmit` 緑
- [ ] T7-2: `pnpm exec eslint .` 緑
- [ ] T7-3: `pnpm test` (vitest) 緑
- [ ] T7-4: agent 側 `uv run ruff check . && uv run ruff format --check . && uv run mypy src && uv run pytest` (今回 agent には影響なし想定。念のため確認)
- [ ] T7-5: `pnpm run build` 緑 (`/equipment` + 新 middleware 含む)
- [ ] T7-6: dev サーバ手動疎通 (詳細生成を 6 回叩いて 429 が返ることを確認)

---

## Phase 8: ドキュメント反映 + デプロイ

- [ ] T8-1: `docs/product-requirements.md` に §5.6 レートリミット (or §9.x 非機能要件追加) を追記 + 改訂履歴
- [ ] T8-2: `docs/glossary.md` に「レートリミット」「hour bucket」追加
- [ ] T8-3: 4 コミット程度に分割して push
  - feat: rate-limit primitives (types/key/bucket/limits/store)
  - feat: with-rate-limit middleware + route 統合
  - feat: client 429 handling (3 hook + toast)
  - chore: firestore rules + docs (PRD/glossary)
- [ ] T8-4: GitHub Actions の Deploy 成功 + 本番に反映を確認
- [ ] T8-5: `gcloud firestore fields ttls update expiresAt --collection-group=rate_limits --enable-ttl` を本番 1 回実行
- [ ] T8-6: 本番で詳細生成を 6 回叩いて 429 を確認 (実コスト発生するので 5 リクエストまで)
- [ ] T8-7: Issue #2 クローズ (本 Slice の振り返りコメント付き)

---

## Phase 9 (任意 / Slice 10 以降): 観測性強化

- [ ] T9-1: Cloud Logging で `severity=WARNING AND jsonPayload.message='rate_limited'` をフィルタする log-based metric を作成
- [ ] T9-2: Cloud Monitoring ダッシュボードに 429/h と remaining 分布を追加

> Slice 9 内ではコードまでで、ダッシュボード作成は別途。

---

## マイルストーン

| マイルストーン | 含むフェーズ | 完了条件 |
| --- | --- | --- |
| **M1: コア primitives** | Phase 1, 2 | Memory store でカウンタ動作 |
| **M2: middleware** | Phase 3 | 429 レスポンスが組み立てられる |
| **M3: route 適用** | Phase 4 | 3 route で 429 が返る (ユニットテスト) |
| **M4: クライアント** | Phase 5 | 429 → Toast 表示できる |
| **M5: rules + 検証** | Phase 6, 7 | 全テスト緑 + production build 緑 |
| **M6: デプロイ** | Phase 8 | 本番で 429 が確認できる |

---

## 改訂履歴

| 日付 | 版 | 変更 |
| --- | --- | --- |
| 2026-05-30 | 1.0 | design.md v1.0 を基にフェーズ分解 |
