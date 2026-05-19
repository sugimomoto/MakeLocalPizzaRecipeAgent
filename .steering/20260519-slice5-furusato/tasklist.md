# Slice 5 タスクリスト — 楽天ふるさと納税連動

> 本書は [`requirements.md`](requirements.md) / [`design.md`](design.md) を実装する
> タスク分解。**1 task = 1 commit** (Conventional Commits)、フェーズ末に push & 動作確認。

---

## 進捗ルール

- ステータス: `[ ]` 未着手 / `[~]` 進行中 / `[x]` 完了
- 完了条件 (DoC): 各タスクに記載。lint / typecheck / test がローカルで pass すること
- フェーズ単位で push → CI green を確認してから次フェーズへ
- 1 タスク = 1 commit を原則とする (関連修正のみ同梱可)
- コミットメッセージは Conventional Commits + `Co-Authored-By: Claude` フッタ

---

## サマリ (合計 18 タスク / 7 フェーズ)

| Phase | 主題 | タスク数 |
|---|---|---|
| Phase 1 | Domain 型 + Security Rules + env スイッチ | 3 |
| Phase 2 | Python furusato レイヤ (client / normalize / cache) | 4 |
| Phase 3 | Python refresh CLI + ingredients YAML 拡張 | 2 |
| Phase 4 | Web Firestore ヘルパ + useFurusatoItems フック | 2 |
| Phase 5 | UI コンポーネント (FurusatoSection / Card / Skeleton / Credit) | 3 |
| Phase 6 | DetailClient 組込 + dev 疎通確認 | 1 |
| Phase 7 | seed スクリプト + README + CI 確認 + v0.5.0 タグ | 3 |

---

## Phase 1 — Domain 型 + Security Rules + env スイッチ

### T-501 Domain 型 (TS + Python) + Zod schema

- [x] `src/domain/furusato.ts`: `FurusatoItem` / `FurusatoItemsDoc` 型
- [x] `agent/src/makelocal_agent/domain/furusato.py`: 同じ shape の Pydantic
- [x] テスト: TS type smoke 3 件 / Python model_validate 11 件 (extra='forbid' / gt=0 / 任意フィールド / round-trip)
- [x] Zod schema は不要 (Firestore からの read 時に subscribe ヘルパで normalize する設計)
- **DoC**: vitest + pytest green、両言語で同 shape
- **commit**: `feat(slice5): add FurusatoItem domain type (TS + Python)` (12de635)

### T-502 Firestore Security Rules: `furusato_items/*` public read / write deny

- [x] `firestore.rules` に `match /furusato_items/{ingredientId}` を追加
- [x] `tests/rules/firestore-rules.test.ts` に Slice 5 用テスト 5 件追加 (未認証 read OK / 認証済み read OK / 未認証 write 不可 / 認証済み write 不可 / delete 不可)
- **DoC**: `pnpm test:rules` green (既存 8 + Storage 4 + 新規 5 = 17 件)
- **commit**: `feat(slice5): add Firestore rules for furusato_items collection` (452b287)

### T-503 env スイッチ + `.env.example` 拡張

- [x] `.env.example` に Slice 5 セクションを新設:
  - `NEXT_PUBLIC_FURUSATO_INTEGRATION=off` (Web 既定)
  - `MLPR_FURUSATO_INTEGRATION=off` (Python 既定)
  - `MLPR_USE_MOCK_FURUSATO=false`
  - `RAKUTEN_APPLICATION_ID` / `RAKUTEN_ACCESS_KEY` / `RAKUTEN_AFFILIATE_ID`
- [x] 楽天デベロッパー登録の取得手順を inline コメントで documented
- [ ] README は T-517 で本格更新予定
- **DoC**: `.env.example` をコピーすれば Slice 5 を `off` で安全に試せる
- **commit**: `chore(slice5): document furusato env vars in .env.example` (b7f9aa2)

→ **push & CI green 確認**

---

## Phase 2 — Python furusato レイヤ

### T-504 `rakuten_client.py` (新エンドポイント版)

- [x] `agent/src/makelocal_agent/furusato/rakuten_client.py`:
  - `RAKUTEN_API_BASE = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401"`
  - `RakutenClient` クラス (applicationId UUID + `accessKey` ヘッダ + 1.05s rate limit + `keyword` AND「ふるさと納税」)
  - `search_furusato(keyword, max_items, max_donation_yen)` 実装
  - settings 拡張: furusato_integration / use_mock_furusato / firestore_emulator_host + 新規 RakutenSettings
- [x] `agent/tests/test_rakuten_client.py`: httpx.MockTransport で API レスポンス 10 件
- **DoC**: pytest green / ruff / mypy strict pass / 1.05s rate limit を時計で観測
- **commit**: `feat(slice5): add RakutenClient for new endpoint (UUID + accessKey)` (3253330)

### T-505 `normalize.py` (raw → FurusatoItem)

- [x] `agent/src/makelocal_agent/furusato/normalize.py`:
  - `from_rakuten_item(raw, *, ingredient_id, fetched_at)` 関数
  - `{"Item": {...}}` ラップ / 平坦の両方を許容
  - 自治体抽出 regex (都道府県のみ / 市町村区まで両対応)
  - 「ふるさと納税」未表記の safety net で `None` を返す
- [x] `agent/tests/test_furusato_normalize.py`: 28 件 (ラップ形式 / 平坦 / 自治体パース 6 パラメタライズ / 必須欠落 / safety net / 画像 URL 3 形式 / fetched_at)
- **DoC**: pytest green
- **commit**: `feat(slice5): add normalize.py for Rakuten raw → FurusatoItem` (089c30d)

### T-506 `cache.py` (Protocol + InMemory + Firestore)

- [x] `agent/src/makelocal_agent/furusato/cache.py`:
  - `FurusatoCache` Protocol (get / set)
  - `InMemoryFurusatoCache` (テスト・Mock 用)
  - `FirestoreFurusatoCache` (Admin SDK 同期 API を asyncio.to_thread で逃がす)
  - TTL 7 日のアプリ側評価
- [x] `agent/tests/test_furusato_cache.py`: 11 件 (InMemory の get/set/TTL/overwrite/isolation 等)
- **DoC**: pytest green / Firestore Emulator 接続テストは Slice 6 CI 統合
- **commit**: `feat(slice5): add FurusatoCache (Protocol + InMemory + Firestore)` (4dfa302)

### T-507 `tool.py` + DI (`deps.py`)

- [x] `agent/src/makelocal_agent/furusato/tool.py`:
  - `lookup_items_by_ingredient_id(ingredient_id)` ADK tool placeholder
  - `_is_disabled()` で `MLPR_FURUSATO_INTEGRATION` を見る
  - cache が inject 済か確認
- [x] `agent/src/makelocal_agent/deps.py`: `get_furusato_cache()` factory + reset/set_for_testing
- [x] `agent/tests/test_furusato_tool.py` + test_deps.py 拡張: 16 件 (disabled / cache miss / cache hit / factory 分岐)
- **DoC**: pytest green / mypy / ruff / format 全 green、232 件 pytest pass
- **commit**: `feat(slice5): add furusato tool + DI factory` (78f702c)

→ **push & CI green 確認**

---

## Phase 3 — Python refresh CLI + ingredients YAML

### T-508 `refresh_furusato_cache.py` 手動 CLI

- [x] `agent/scripts/refresh_furusato_cache.py`:
  - argparse で `--dry-run` / `--in-memory` / `--only <id>` / `--max-items 3`
  - ingredients YAML を load → 各 ingredient について `searchQuery or name` をキーワード化
  - `RakutenClient.search_furusato` → `from_rakuten_item` → `cache.set`
  - 1 食材 1 行 JSON ログ
  - .env を agent/.env + root .env 両方からロード (python-dotenv)
  - 例外は捕まえて続行
- [x] 動作確認: `uv run python scripts/refresh_furusato_cache.py --in-memory --dry-run` で 30 食材を完走
- [x] IP ホワイトリスト登録の前に 403 (CLIENT_IP_NOT_ALLOWED) を確認、retrospective の警告を実証
- **DoC**: スクリプトが完走して JSON ログを 1 行ずつ出す
- **commit**: `feat(slice5): add refresh_furusato_cache CLI script` (f60c57d)

### T-509 ingredients YAML に `searchQuery` を追加 (0/低件数のみ)

- [x] `agent/data/ingredients.yaml` には既に optional `searchQuery` フィールドあり (data loader も対応済)
- [x] `--dry-run` で 0/低件数の食材を可視化 (nagano-zuiki: 0、kochi-myoga: 0)
- [x] kochi-myoga の searchQuery を「みょうが」(ひらがな単独) に変更 → 3 件取得確認
- [x] nagano-zuiki は楽天側在庫不足 (retrospective 同様)、0 件のまま受け UI で非表示扱い
- [x] `src/data/ingredients.generated.json` を `scripts/build-ingredient-data.ts` で再生成
- **DoC**: 30 食材中 29 件で count=3、1 件のみ 0 件 (許容範囲)
- **commit**: `feat(slice5): tune searchQuery for kochi-myoga to ひらがな form` (0bbae04)

→ **push & CI green 確認**

---

## Phase 4 — Web Firestore ヘルパ + フック

### T-510 `src/lib/firebase/furusato.ts` (read-only ヘルパ)

- [x] `subscribeFurusatoItems(db, ingredientId, onChange, onError): Unsubscribe`
  - `furusato_items/{id}` の `onSnapshot`
  - doc 不在 / TTL 切れ なら空配列
  - Firestore Timestamp / Date / ISO 文字列の 3 形式を Date に正規化
  - 各 item を最小バリデーション (itemId / title / url / donationAmount>0) で弾く
- [x] テスト 6 件 (firebase/firestore モック; doc 不在 / fresh / TTL 切れ / 必須欠落 / error / Unsubscribe)
- **DoC**: vitest green
- **commit**: `feat(slice5): add Firestore subscribeFurusatoItems helper` (d968bec)

### T-511 `src/hooks/use-furusato-items.ts`

- [x] `useFurusatoItems(ingredientIds: string[]): { state, items, error }`
- [x] `NEXT_PUBLIC_FURUSATO_INTEGRATION!='on'` で `{ state: 'disabled', items: [], error: null }`
- [x] 各 id について `subscribeFurusatoItems` を並列で張る (useEffect で N 個)
- [x] 結果を bucket map に保持 → flatten + `donationAmount` 昇順 sort
- [x] 全 ingredient で first snapshot 受信したら ready 遷移
- [x] ingredientIds 変更で全 unsub → 張り直し
- [x] テスト 7 件 (disabled / 空 / loading / flatten+sort / error / unmount / resubscribe)
- **DoC**: vitest green
- **commit**: `feat(slice5): add useFurusatoItems hook` (a93731c)

→ **push & CI green 確認**

---

## Phase 5 — UI コンポーネント (採用案 Card B inline)

### T-512 `FurusatoCard` (Card B inline)

- [x] `src/components/furusato/FurusatoCard.tsx` + CSS (Claude Design Card B sub-variant B1 inline 採用):
  - kinari BG / radius 12 / padding 12 / hairline border
  - 72×72 サムネ (imageUrl or 🎁 fallback)
  - RAKUTEN chip (muted, mono 8.5, ↗ icon) + 自治体
  - mincho 13/600 title (line-clamp 2)
  - producer (任意)
  - 寄附額 (mono 13 + 円〜)
  - 在庫切れバッジ + opacity 0.65
  - 「取り寄せる ↗」CTA (sumi BG / kinari color)
  - `<a href={affiliateUrl ?? url} target="_blank" rel="noopener noreferrer sponsored">` で全体リンク化
- [x] テスト 8 件 (title / muni / producer / 寄附 / 在庫切れ / link / 画像 fallback)
- **DoC**: vitest green
- **commit**: `feat(slice5): add FurusatoCard + Skeleton + RakutenCredit` (0ed28ac)

### T-513 `FurusatoSkeleton` + `RakutenCredit`

- [x] `FurusatoSkeleton.tsx`: shimmer な 72px サムネ + 3 バー + 価格行
- [x] `RakutenCredit.tsx`: 小 R アイコン + 「POWERED BY 楽天ウェブサービス」(mono 9.5 muted)
- [x] テスト 2 件 (aria-label / 文言)
- **DoC**: vitest green
- **commit**: `feat(slice5): add FurusatoCard + Skeleton + RakutenCredit` (0ed28ac、T-512 同梱)

### T-514 `FurusatoSection` (root)

- [x] `FurusatoSection.tsx` + CSS:
  - SectionHeader (jp "取 寄" + hairline + en "FURUSATO") + subcopy
  - 4 状態の描画分岐 (disabled / loading / ready 空 / ready N / error)
  - 案 X: ready 空はセクション非表示
  - 最下部に RakutenCredit
- [x] テスト 5 件 (4 状態 + error + credit 維持)
- **DoC**: vitest green
- **commit**: `feat(slice5): add FurusatoSection + wire into DetailClient` (a6fb67a)

→ **push & CI green 確認**

---

## Phase 6 — DetailClient 組込 + 疎通確認

### T-515 `DetailClient` に `<FurusatoSection>` を組込

- [x] `app/recipes/[candidateId]/_components/DetailClient.tsx`:
  - `<StepList>` の section と `<StoryCard>` の間に `<FurusatoSection ingredientIds={pending?.ingredients ?? []} />` を挿入
- [x] dev サーバで疎通: `NEXT_PUBLIC_FURUSATO_INTEGRATION=on` で UI 表示確認、Firestore Emulator に 87 items seed 済
- [x] 既存テストが全 pass (447 件、regression なし)
- **DoC**: typecheck / lint / vitest green / dev で目視確認
- **commit**: `feat(slice5): add FurusatoSection + wire into DetailClient` (a6fb67a、T-514 同梱)

→ **push & CI green 確認**

---

## Phase 7 — seed + README + CI + v0.5.0

### T-516 seed 兼用ラッパスクリプト

- [x] 別途 TS seed スクリプトは作らず、Python `refresh_furusato_cache.py` を seed 兼用化
- [x] `package.json` scripts に `seed:furusato` (本走) と `seed:furusato:dry` (dry-run) を追加
- [x] 実 API キーがあれば 87 items が Emulator に書き込まれる (Phase 3 で実証済)
- **DoC**: `pnpm seed:furusato` で Firestore Emulator に書き込み完走
- **commit**: T-517 と同梱予定

### T-517 README 全面更新 + Slice 5 ステアリングへのリンク

- [x] 機能リストを Slice 5 で更新、サブヘッダ「(Slice 5 時点)」に変更
- [x] 新セクション「開発 — 楽天ふるさと納税連動 (Slice 5)」を追加:
  - 楽天デベロッパー登録 / IP ホワイトリスト / 必要 env
  - `pnpm seed:furusato` / `pnpm seed:furusato:dry` / `--only <id>`
  - 3 層分離の図解と「runtime は Firestore キャッシュ read のみ」
  - Card B inline + クレジット表記 (楽天規約 §8)
  - `name` と `searchQuery` の分離 (kochi-myoga の例)
- [x] 関連ドキュメントに Slice 5 ステアリングを追加
- **DoC**: 新規開発者が README だけで Slice 5 を動かせる
- **commit**: 次の `chore(slice5): bump to v0.5.0` で同梱

### T-518 v0.5.0 タグ + 完了

- [x] `package.json` を 0.5.0 にバンプ
- [x] `agent/pyproject.toml` を 0.5.0 にバンプ
- [x] `NEXT_PUBLIC_APP_VERSION=0.5.0` を `.env.example` に
- [ ] CI 全 green を確認 (push 後)
- [ ] `git tag -a v0.5.0 -m "Slice 5 — Rakuten Furusato connection"` + push v0.5.0
- **DoC**: 全 CI green / 手動 dev で詳細画面に「取 寄 / FURUSATO」セクション + カードが出る / タグ push 済
- **commit**: `chore(slice5): wrap-up README + bump to v0.5.0`

→ **push & tag v0.5.0**

---

## Slice 5 完了の DoD (Definition of Done)

1. `NEXT_PUBLIC_FURUSATO_INTEGRATION=on` + Emulator に seed 済 で、詳細画面下部に「取 寄 / FURUSATO」セクションが出て、ふるさと納税カード (Card B inline) が表示される
2. 各カードの「取り寄せる ↗」CTA をタップすると `affiliateUrl ?? url` が新タブで開く
3. 在庫切れの item には「在庫切れ」バッジ + opacity 0.65 が表示される
4. カード下に「POWERED BY 楽天ウェブサービス」クレジット表記が出る
5. `NEXT_PUBLIC_FURUSATO_INTEGRATION=off` でセクション自体が非表示になる
6. `uv run python agent/scripts/refresh_furusato_cache.py --in-memory --dry-run` が 3 県の全食材で count を出す (0 件食材なし、retrospective 実績相当)
7. Firestore Emulator + Admin SDK で `furusato_items/{id}` が書き込める (refresh CLI 本走 or seed script)
8. Security Rules: `furusato_items/*` は public read OK / client write 不可 (rules test 10 件以上 green)
9. Python pytest + TS vitest 全 green
10. CI 全 job (Node / E2E / Rules / Python) green
11. v0.5.0 タグ push 済

---

## 改訂履歴

| 日付 | 版 | 変更内容 |
|---|---|---|
| 2026-05-19 | 1.0 | 初版作成 (Claude Design Card B inline 採用版) |
