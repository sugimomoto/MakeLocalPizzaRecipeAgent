# Slice 5 要求書 — 楽天ふるさと納税連動

## 1. このスライスのゴール (1 行)

**詳細画面で「このレシピの食材は、ふるさと納税の返礼品としても入手できます」を出す** ようにする。
副次として、楽天 API 周りの「3 層分離」「`name` / `searchQuery` 分離」「`FURUSATO_INTEGRATION` on/off スイッチ」を仕込み、Slice 6 (Cloud Run デプロイ) と Slice 7 (週次 refresh 自動化) の土台にする。

## 2. 背景

### 2.1 前回プロジェクトの遺産

姉妹プロジェクト [`MakePizzaRecipeAgent`](https://github.com/sugimomoto/MakePizzaRecipeAgent) の Slice 7 (`.steering/20260504-local-ingredients-furusato/`) で楽天 API 連動を実装済。**retrospective.md に楽天 API の罠が網羅されており、本スライスではそれを引き継ぐ**。詳細は §6 参照。

### 2.2 何が無い状態か

- Slice 4 までで「サインイン → 候補 3 案 → 詳細レシピ → ピザ帳保存」のメインジャーニーは完成
- ただし詳細画面で **「材料を取り寄せる」導線が無い**
- ハッカソンのコンセプト「**つくる × まわす × とどける**」のうち「とどける」が Slice 6 (Cloud Run) に閉じてしまっており、エンドユーザに直接届く「とどける」(= 食材取り寄せ) が薄い
- 楽天 API キーは既に取得済 (UUID applicationId + `pk_*` accessKey)

### 2.3 ふるさと納税連動の価値

| 観点 | 価値 |
|---|---|
| ユーザ | 「このレシピを作りたい」と思った瞬間に **食材を取り寄せる導線** が同じ画面にある |
| プロダクト | 地元 × 食材という縦軸を「**自治体への寄付**」という横軸に繋げる ("地元を残す" のテーマと合致) |
| ハッカソン | 「とどける」軸を Cloud Run 以外でも具体化できる |

## 3. スコープ

### 3.1 IN (Slice 5 で実装)

| カテゴリ | 何 |
|---|---|
| **Domain 型** | `FurusatoItem` を TS + Python の両方に追加 (前回プロジェクトと互換、`furustoItems` の typo は `furusatoItems` に修正) |
| **YAML 拡張** | ingredients YAML に optional `searchQuery` フィールド追加。3 県分 (宮城・長野・高知) のキュレーション食材で 0/低件数のものだけ手当する (前回式 `--dry-run` で確認) |
| **Python furusato レイヤ** | `agent/.../furusato/` 配下に `rakuten_client.py` / `normalize.py` / `cache.py` / `tool.py` を前回プロジェクトから流用 + 本プロジェクトの依存関係 (pydantic / observability / settings) に合わせて調整 |
| **手動 refresh CLI** | `agent/scripts/refresh_furusato_cache.py` — `--dry-run` / `--in-memory` / `--only <id>` / `--max-items 3` を前回式で実装 |
| **Firestore キャッシュ** | コレクション `furusato_items/{ingredientId}`、TTL 7 日、`{ingredientId, items: FurusatoItem[], refreshedAt, ttlExpiresAt}` |
| **Security Rules** | `furusato_items/*` は **public read / client write 不可** (refresh script = Admin SDK だけが書く) |
| **Web 取得経路** | Web SDK で `furusato_items/{ingredientId}` を直接 `onSnapshot` 購読する `useFurusatoItems(ingredientIds: string[])` フック |
| **UI (DetailClient)** | 食材セクション (`手 順` の下、`StoryCard` の上) に「🎁 ふるさと納税」セクションを追加。クレジット表記 (楽天規約 §8) を必ず併設 |
| **on/off スイッチ** | `MLPR_FURUSATO_INTEGRATION` (Python 側) / `NEXT_PUBLIC_FURUSATO_INTEGRATION` (Web 側) で off にすると UI に「ふるさと納税」セクションが出ない (safe rollout) |
| **Mock 開発支援** | `MLPR_USE_MOCK_FURUSATO=true` で Python 側を InMemory cache + ダミーデータに固定。Web 側はそもそも Firestore Emulator の `furusato_items` を read するので `pnpm test:rules` で覆える |
| **CI** | rules テストに `furusato_items` 公開 read / write deny の検証を追加。Python の furusato 周りに pytest を追加 |
| **ドキュメント** | README に楽天 API 取得手順 + `.env` 設定 + refresh CLI の使い方 + クレジット表記の理由を追記。`.env.example` を更新 |

### 3.2 OUT (Slice 5 では実装しない)

| 何 | いつ |
|---|---|
| 週次 refresh の自動化 (Cloud Run Jobs / Cloud Scheduler) | Slice 6 / Slice 7 (デプロイと一緒) |
| Secret Manager 経由のキー注入 | Slice 6 (デプロイ時) |
| 47 県カバー (現在 3 県) | 後続スライス、1 県/週ペース想定 |
| editor's pick / 在庫切れフィルタ / 寄付額ソート / 自治体グルーピング UI | 後続 polish |
| Vertex AI Grounding による食材データ半自動生成 | Slice 8+ |
| 詳細画面以外への配置 (ピザ帳 / TOP / 一覧画面) | 後続スライス |
| 取得した `furusatoItems` の Firestore 永続化 (SavedRecipe にぶら下げる) | 後続スライス (Slice 4 と統一: 詳細スナップショットは保存しない方針) |

## 4. ユーザーストーリー

- **US-1**: 詳細レシピを開いたら、その食材を「ふるさと納税で取り寄せる」リンクが下部に出てほしい (寄付額・自治体・在庫表示付き)
- **US-2**: タップすると楽天市場 (アフィリエイト URL) が新タブで開いてほしい
- **US-3**: ふるさと納税連動を一時的に off にしたい場合 (法的レビュー前など) は env 1 つで切り替えられてほしい
- **US-4**: 開発者として、楽天 API のレート制限 (1 req/秒) と IP 制限を意識せず開発できるよう、refresh は手動・runtime は Firestore キャッシュという 3 層分離を守りたい
- **US-5**: 楽天 API キーが無い CI 環境でも、Mock 経由で動作確認・E2E が回ってほしい

## 5. 機能要件

### 5.1 詳細画面 UI

1. `DetailClient` の `<StoryCard>` の **直前** に新セクション挿入
2. セクション構成:
   - 見出し「🎁 ふるさと納税で取り寄せる」(SectionLabel 流用)
   - サブ「このレシピの食材は、ふるさと納税の返礼品としても入手できます。」
   - カードリスト (1 食材につき 1〜3 件、最大 12 件)
3. 各カード:
   - 画像 (imageUrl があれば 72px) — fallback 🍕 絵文字
   - タイトル (mincho, 14px, 2 行 ellipsis)
   - 自治体 (gothic, 10px)
   - 生産者 (任意, gothic, 10px)
   - 寄附 NNN,NNN 円〜 (mono, 11px)
   - 「在庫切れの可能性」バッジ (`inStock=false` のとき)
   - クリックで `affiliateUrl ?? url` を `target="_blank" rel="noopener noreferrer sponsored"` で開く
4. クレジット表記 (フッター扱い、必須):
   > Powered by 楽天ウェブサービス

### 5.2 useFurusatoItems(ingredientIds) フック

- 入力: 詳細レシピの materials から抽出した `ingredientId[]` (Slice 5 では空配列 → mock or 既知の id を採用、Slice 6 で agent から取れるようにする検討)
- 出力: `{ state: 'loading' | 'ready', items: FurusatoItem[], error: Error | null }`
- 内部: 各 ingredientId について `furusato_items/{id}` を onSnapshot で並列購読し、結果を flatten → `donationAmount` 昇順で並べる
- `NEXT_PUBLIC_FURUSATO_INTEGRATION=off` で常に `{ state: 'ready', items: [] }` を返す

### 5.3 Python furusato レイヤ

- `rakuten_client.py`: 新エンドポイント (`openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401`)、UUID applicationId、`accessKey` ヘッダ、`keyword` に「ふるさと納税」AND 結合、1.05s/req
- `normalize.py`: raw → `FurusatoItem`、自治体抽出 regex、「【ふるさと納税】」プレフィックス safety net
- `cache.py`: `FurusatoCache` Protocol + InMemory + Firestore 実装、TTL 7 日
- `tool.py`: `lookup_items_by_ingredient_id(ingredient_id)` (ADK tool として finalize で使う可能性ありだが、Slice 5 では Web 直 read 主軸)

### 5.4 refresh_furusato_cache.py

- 全 ingredient (YAML から読込) について楽天 API を叩いてキャッシュ更新
- フラグ:
  - `--dry-run` キャッシュに書かず stdout に出す
  - `--in-memory` Firestore に書かず InMemory
  - `--only <ingredient_id>` 1 食材だけ
  - `--max-items 3` 各食材の上限
- ログ: 1 食材 1 行 JSON (Cloud Logging で集計可能)

## 6. 非機能要件 + 引き継ぎ事項

### 6.1 前回プロジェクト retrospective から引き継ぐ罠

1. **新エンドポイント必須** — `openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401`。旧 endpoint (`app.rakuten.co.jp/...`) は新 UUID applicationId を 400 で弾く
2. **`genreId=561023` (ふるさと納税) は機能しない** — `keyword` AND 結合 + normalize で「【ふるさと納税】」プレフィックス検証の 2 段防御
3. **`name` と `searchQuery` の分離** — 連体修飾入りの `name` ("せり(根付き)" など) は AND 検索を殺す。45 食材中 4 件で `search_query` を上書きして 132 件取得できた実績
4. **applicationId は数字 → UUID に変わった + accessKey ヘッダ追加** — 公式アナウンス無し
5. **IP ホワイトリスト要求のケースあり** — refresh script を走らせる環境 (devcontainer / 開発機 / Slice 7 で Cloud Run Jobs) を applicationId に登録
6. **レート制限 1 req/秒** — 1.05s 間隔を厳守
7. **楽天規約 §8 クレジット表記必須** — 前回 retrospective で「Slice 8 必須」とマークされていた、**今回は最初から入れる**

### 6.2 設計判断 (採用方針)

| カテゴリ | 採用 | 不採用 |
|---|---|---|
| 取得経路 | Web SDK で Firestore 直 read | BFF route 経由 / Python stream 配信 |
| UI 配置 | DetailClient `<StoryCard>` 直前 | 食材セクション inline / 別タブ |
| スコープ | 3 県 × 手動 refresh + 直 read + UI | cron 自動化 / 47 県 / Editor's Pick |
| YAML 編集 | dry-run で 0/低件数を可視化して該当のみ手当 | 全食材 search_query の理論設計 |
| `furusatoItems` の Firestore 永続化 | しない (毎回最新を取る) | SavedRecipe にぶら下げ |

### 6.3 セキュリティ・プライバシ

- 楽天 API クレデンシャル: `.env` に格納、`.env.example` にはダミー値、CI では `cp .env.example .env`
- `furusato_items/*` は **public read OK** (商品情報は公開データ、検索コストも問題ない)
- 楽天 API は **refresh script からのみ叩く** (3 層分離)

### 6.4 観測性 / オフライン開発

- `MLPR_USE_MOCK_FURUSATO=true` で `InMemoryFurusatoCache` + dummy items を返す (オフライン開発・CI)
- `MLPR_FURUSATO_INTEGRATION` / `NEXT_PUBLIC_FURUSATO_INTEGRATION` の 2 系統スイッチ (off で UI 非表示 + cache read を bypass)

## 7. 成功基準 (DoD)

1. ✅ http://localhost:3001/recipes/[id] を開くと食材セクション下に「🎁 ふるさと納税で取り寄せる」が出る
2. ✅ ふるさと納税カードをタップすると楽天市場が新タブで開く (アフィリエイト URL 付き)
3. ✅ クレジット表記「Powered by 楽天ウェブサービス」がフッターに出る
4. ✅ `MLPR_USE_MOCK_FURUSATO=true` で実 API なしでも UI が動く
5. ✅ `NEXT_PUBLIC_FURUSATO_INTEGRATION=off` で UI から「🎁 ふるさと納税」セクションが消える
6. ✅ `uv run python agent/scripts/refresh_furusato_cache.py --dry-run` で 3 県の全食材について件数を出せる
7. ✅ Firestore Emulator に `furusato_items/{id}` を refresh CLI で書き込める
8. ✅ Security Rules: `furusato_items/*` は public read OK / client write 不可 (rules テスト 2 件以上 green)
9. ✅ Python pytest + TS vitest 全 green
10. ✅ CI 全 job (Node / E2E / Rules / Python) green
11. ✅ v0.5.0 タグ push

## 8. 想定外スコープ (やらない)

- ❌ 47 県カバー (Slice 5 では 3 県のみ。後続 1 県/週ペース)
- ❌ cron 自動 refresh (Slice 6/7)
- ❌ Secret Manager 経由のキー注入 (Slice 6)
- ❌ 寄付額ソート / 自治体グルーピング / 在庫フィルタ UI (後続 polish)
- ❌ TOP / /library / 候補画面への配置 (Slice 5 は詳細画面のみ)
- ❌ `furusatoItems` を SavedRecipe に焼き込み (Slice 4 と統一: スナップショット保存しない)

## 9. リスクと緩和

| リスク | 緩和策 |
|---|---|
| 楽天 API の IP 制限で refresh が 403 | 開発機 IP を applicationId に登録、`emit_event` でログ |
| 0 件食材が多発 | `searchQuery` 手当で吸収、retrospective の実績 (45 中 4 件) からして大半は問題なし |
| 楽天規約違反 (クレジット表記漏れ) | 設計時点で UI 必須化 + CI lint で検出する案 (Slice 6 で検討) |
| Web の `useFurusatoItems` が多数の onSnapshot を張って重い | 詳細画面 1 つにつき materials は最大 ~10 件、並列 onSnapshot 10 個は問題なし。気になれば Slice 6 で BFF route に統合 |
| Auth Modal の流れと衝突 | ふるさと納税セクションは未サインインでも見える (Firestore rules 上 public read)。サインイン状態に依存しない |

## 10. 改訂履歴

| 日付 | 版 | 変更内容 |
|---|---|---|
| 2026-05-19 | 1.0 | 初版作成 |
