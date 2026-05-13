---
name: rakuten-furusato-api
description: 楽天 Web Service の IchibaItem/Search API（ふるさと納税向け）の実証ベース仕様。新エンドポイント `openapi.rakuten.co.jp` 主軸、UUID 形式 applicationId、accessKey ヘッダ、ふるさと納税絞込の罠、本プロジェクトでの実装マッピングをまとめる。Slice 7 の furusato 連動レイヤを触るときに参照。
---

# 楽天 IchibaItem/Search API（ふるさと納税）リファレンス

> **検証日: 2026-05-05（実機 curl で確認）**
> 本リポジトリの `agent/src/makepizza_agent/furusato/` 配下を触るときに参照する。

---

## 1. エンドポイント

| 系統 | URL | 状態 |
|---|---|---|
| **新（本プロジェクトで使用中）** | `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401` | **新規発行 applicationId はこちら専用** |
| 旧 | `https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601` | 古い数字形式 applicationId 用。新規 UUID では HTTP 400 |

**実証**: UUID 形式 applicationId（例 `456997e5-...`）で旧エンドポイントを叩くと `{"error":"wrong_parameter","error_description":"specify valid applicationId"}` が返る。新規アプリは新エンドポイント専用。

---

## 2. 認証

### applicationId（必須）
- **UUID 形式**（新仕様）。例: `456997e5-f00a-4874-ac61-3c29960cf4bb`
- 旧仕様の数字 ID とは別物。
- 取得: https://webservice.rakuten.co.jp/app/create
- アプリ管理: https://webservice.rakuten.co.jp/app/list

### accessKey（必須）
- 新エンドポイント専用。**`pk_` プレフィックス**の publishable key 形式（44 文字程度）。例: `pk_69aJPU5hj0N3BDGpA3rW7zBbKMNdKWtX8R6N25GxgiB`
- **`accessKey` ヘッダ**で渡す（クエリではない）。Header name は **キャメルケース完全一致**。
- アプリ詳細画面で取得。

### affiliateId（任意）
- 楽天アフィリエイトの ID と同一。形式: `xxxxxxxx.xxxxxxxx.xxxxxxxx.xxxxxxxx`
- 登録: https://affiliate.rakuten.co.jp/
- **規約上、API 経由の収益化は楽天アフィリエイト経由のみ許可**（§8）。

### affiliateId 付与時のレスポンス差分（新エンドポイント実証）
| フィールド | なし | あり |
|---|---|---|
| `itemUrl` | 通常の商品ページ URL | 通常のまま（書き換わらない） |
| `affiliateUrl` | 空文字 or 空 | `https://hb.afl.rakuten.co.jp/...` |
| `affiliateRate` | 0 / 出力なし | 商品料率（%） |
| `shopAffiliateUrl` | 出力なし | ショップのアフィリエイト URL（**新仕様で追加**） |

---

## 3. リクエストパラメータ

### 必須
- `applicationId`（UUID）
- `accessKey` ヘッダ
- `keyword` / `shopCode` / `itemCode` / `genreId` のうち最低 1 つ

### **⚠️ 重要：ふるさと納税絞込の罠**

**`genreId=561023`（ふるさと納税）を新エンドポイントで指定すると count=0 が返る**（実証済み）。旧仕様では効いていた絞込が新エンドポイントで機能しない。

**正解戦略**: `keyword` に「ふるさと納税」を AND 結合する。
- `keyword=ふるさと納税 牡蠣` → 4,533 件
- `keyword=ふるさと納税 蔵王 モッツァレラ` → 4 件（**チーズ工房モッツァオ含む**）
- `keyword=ふるさと納税 北海道 帆立` → 3,579 件

商品名には必ず `【ふるさと納税】` プレフィックスが付くので、normalize 段で post-filter すれば取りこぼし対策にもなる。

本プロジェクトの [`rakuten_client.py:_with_furusato`](../../../agent/src/makepizza_agent/furusato/rakuten_client.py) で自動 AND 結合、[`normalize.py:from_rakuten_item`](../../../agent/src/makepizza_agent/furusato/normalize.py) で「ふるさと納税」を含まない商品を弾く実装になっている。

### 表示制御
| param | 値 | 既定 | 備考 |
|---|---|---|---|
| `hits` | 1〜**30** | 30 | **30 超は 400** |
| `page` | 1〜**100** | 1 | **100 ページ × 30 = 最大 3000 件** |
| `sort` | `standard` / `+itemPrice` / `-itemPrice` / `+reviewCount` / `-reviewCount` / `+reviewAverage` / `-reviewAverage` / `+affiliateRate` / `-affiliateRate` / `+updateTimestamp` / `-updateTimestamp` | `standard` | `+` は要 URL エンコード（`%2B`） |
| `format` | `json` / `xml` | `json` | 本プロジェクトは `json` 固定 |
| `formatVersion` | `1` / `2` | `1` | **新エンドポイントでも既定は v1**（`Items[].Item.{...}` ラッパあり、実証済み） |
| `elements` | カンマ区切り | 全フィールド | レスポンス絞込 → 帯域削減 |

### 価格・在庫
| param | 既定 | 備考 |
|---|---|---|
| `minPrice` | — | 1〜999,999,998 |
| `maxPrice` | — | 1〜999,999,999（本プロジェクトで `max_donation_yen`） |
| `availability` | **`1`（在庫あり）** | `0` で在庫切れも含む。レシピ用途では既定 |

### 検索精度
| param | 既定 | 備考 |
|---|---|---|
| `field` | **`1`（厳密）** | 0 件になりがち。**広めに探すなら `field=0` を明示**。本プロジェクトは常に `field=0` |
| `orFlag` | `0` (AND) | `1` で OR |
| `NGKeyword` | — | 除外キーワード |

### 商品属性フラグ
| param | 値 | 備考 |
|---|---|---|
| `imageFlag` | 0/1 | **`1` で画像あり商品のみ → 推奨。本プロジェクトは常に 1** |
| `hasReviewFlag` | 0/1 | |
| `pamphletFlag` | 0/1 | |
| `giftFlag` | 0/1 | |

### 本プロジェクトで使用中の組合せ
```
endpoint: openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401
header:   accessKey: <pk_xxx>
query:    applicationId=<UUID>
          keyword=ふるさと納税 <食材キーワード>
          hits=<1-30>
          format=json
          field=0
          availability=1
          imageFlag=1
          [maxPrice=<円>]
          [affiliateId=<xxxxx.xxxxx.xxxxx.xxxxx>]
```

---

## 4. レスポンス構造

### トップレベル（メタ）
```json
{
  "count": 80619,
  "page": 1,
  "first": 1,
  "last": 30,
  "hits": 30,
  "carrier": 0,
  "pageCount": 100,
  "Items": [ ... ],
  "GenreInformation": [],
  "Attributes": []
}
```

### `Items[]` の構造（新エンドポイント実証）
**新エンドポイントも既定で `formatVersion=1` 相当のラッパ形式**:
```json
{
  "Items": [
    { "Item": { "itemName": "【ふるさと納税】...", "itemPrice": 10000, ... } }
  ]
}
```
→ アクセス: `Items[i]["Item"]["itemName"]`

本プロジェクトの [`normalize.py:_unwrap`](../../../agent/src/makepizza_agent/furusato/normalize.py) は `{"Item": {...}}` と平坦の両方を許容しているので、`formatVersion=2` に切り替えても壊れない。

### `Item` の主要フィールド（新エンドポイント実証ベース）
| フィールド | 型 | 意味 |
|---|---|---|
| `itemName` | string | 商品名（`【ふるさと納税】` プレフィックス付き） |
| `catchcopy` | string | キャッチコピー |
| `itemCode` | string | `<shopCode>:<itemId>` |
| `itemPrice` | long | 寄附額（円） |
| `itemPriceBaseField` | string | **新仕様**：実体価格のフィールド名（"item_price_min3" 等） |
| `itemPriceMin1/2/3` | long | **新仕様**：価格レンジ |
| `itemPriceMax1/2/3` | long | **新仕様**：価格レンジ |
| `itemCaption` | string | 商品説明（長文） |
| `itemUrl` | string | 商品ページ HTTPS URL |
| `affiliateUrl` | string | アフィリエイト URL（affiliateId 付与時） |
| `shopAffiliateUrl` | string | **新仕様**：ショップのアフィリエイト URL |
| `affiliateRate` | float | 料率（%） |
| `imageFlag` | 0/1 | |
| `smallImageUrls` | array of `{imageUrl}` | 64×64px |
| `mediumImageUrls` | array of `{imageUrl}` | 128×128px |
| `availability` | 0/1 | 在庫 |
| `taxFlag` | 0/1 | 0=税込、1=税別 |
| `postageFlag` | 0/1 | 0=送料込/無料、1=送料別 |
| `creditCardFlag` | 0/1 | |
| `shopOfTheYearFlag` | 0/1 | |
| `shipOverseasFlag` | 0/1 | |
| `shipOverseasArea` | string | "JP/US/CN" |
| ~~`asurakuFlag`~~ | 0/1 | **2024-07-01 廃止、常に 0** |
| `asurakuClosingTime` | string | 同上、空 |
| `asurakuArea` | string | 同上、空 |
| `shopName` | string | ショップ名（自治体 or 委託業者） |
| `shopCode` | string | ショップ識別子 |
| `shopUrl` | string | ショップ TOP |
| `reviewCount` | int | |
| `reviewAverage` | float | 0.0–5.0 |
| `genreId` | string | この商品の所属 genre（**新エンドポイントでは省略されるケースあり**） |

本プロジェクトが読んでいる `itemCode / itemName / itemPrice / itemUrl / affiliateUrl / mediumImageUrls / shopName` は **すべて公式定義通り**。

---

## 5. レート制限

- **1 applicationId につき 1 秒に 1 リクエスト**（公式 FAQ 明記）
- **緩和申請不可**
- IP 単位ではなく applicationId 単位
- 本プロジェクト [`rakuten_client.py:_MIN_INTERVAL_SEC`](../../../agent/src/makepizza_agent/furusato/rakuten_client.py) は `1.05s` で実装

### 超過時
- HTTP **`429 Too Many Requests`**
- レスポンス: `{"error": "too_many_requests", "error_description": "..."}`
- `Retry-After` ヘッダが付く場合あり → 尊重して指数バックオフ

---

## 6. エラーレスポンス

形式（共通）:
```json
{ "error": "wrong_parameter", "error_description": "..." }
```

| HTTP | error | トリガ（実証含む） |
|---|---|---|
| 400 | `wrong_parameter` | 必須欠落・型不正・範囲外。**新エンドポイントに旧 applicationId、または旧エンドポイントに UUID applicationId の場合も** |
| 401 / 403 | (要追加調査) | 新エンドポイントで accessKey 欠落時の挙動（要再現） |
| 404 | `not_found` | 存在しない itemCode 等。Search はヒット 0 件でも `count: 0` の正常レスポンス |
| 429 | `too_many_requests` | レート超過 |
| 500 | `system_error` | 楽天側障害 |
| 503 | `service_unavailable` | 計画停止 |

---

## 7. ふるさと納税絞込（実証ベース）

### `genreId=561023` は新エンドポイントで機能しない（実証）
- 旧仕様では「ふるさと納税」横断ジャンル ID として機能していた `561023` は、**新エンドポイントでは count=0 を返す**。
- なぜそうなるかは公式に明記なし（要追加調査）。新仕様では genreId 体系が再編されている可能性。

### 推奨戦略：keyword AND + post-filter
1. リクエスト: `keyword=ふるさと納税 <食材>` で AND 結合
2. レスポンス: 商品名に `【ふるさと納税】` プレフィックスがあれば採用
3. 取りこぼしは [`normalize.py`](../../../agent/src/makepizza_agent/furusato/normalize.py) で「ふるさと納税」未含有を弾く

### 食材軸の絞込
- ジャンル ID で絞らず、`keyword` を「ふるさと納税 + 都道府県 + 食材名」のように組み立てる
- 本プロジェクトの refresh script は [`_build_keyword`](../../../agent/scripts/refresh_furusato_cache.py) で `prefecture name` の組合せを使用

---

## 8. 利用規約・クレジット表記

### クレジット表記（**必須**）
- 公式提供の HTML を **そのまま** 埋め込む（改変不可）
- バナー or テキストリンク "**Supported by Rakuten Developers**"
- 違反すると **API アクセス無効化の可能性**
- 本プロジェクトでは [`RecipeView.tsx`](../../../src/components/recipe/RecipeView.tsx) の 🎁 セクション付近 or フッターに必ず表示すること
- **TODO**: 現状未実装。デプロイ前に対応必須

### アフィリエイト連携時
- 楽天 Web Service 利用規約 **第 10 条 (4)**: 楽天アフィリエイト以外の収益化は禁止
- affiliateId を使うなら楽天アフィリエイト規約も並行遵守

### キャッシュ保存
- 公式に明文化された日数規定なし
- 利用規約 **第 10 条 (7)** で「別目的での複製・改変」は禁止 → **長期 DB 化は NG、短期キャッシュ（数十分〜数日）はセーフ** と一般に解されている
- 本プロジェクトの 7 日 TTL（[`cache.py:DEFAULT_TTL_DAYS`](../../../agent/src/makepizza_agent/furusato/cache.py)）はグレーゾーン上限気味。**3 日 or 1 日**に短縮を検討

---

## 9. 落とし穴・運用上の注意

1. **`genreId=561023` は新エンドポイントで機能しない**（最重要）。`keyword` AND で代替する
2. **新規 UUID applicationId は新エンドポイント専用**。旧 `app.rakuten.co.jp` では HTTP 400
3. **`accessKey` ヘッダ名は完全一致**（`accessKey`、camel case）。`x-rapi-key` などではない
4. **`field` 既定が厳密（=1）**: ヒット 0 になりがち。本プロジェクトは常に `field=0`
5. **`hits` 最大 30 / `page` 最大 100 → 3000 件まで**。それ以上は keyword 変更
6. **在庫切れ既定で除外**（`availability=1`）
7. **`itemUrl` は商品詳細 HTTPS**、`affiliateUrl` は `hb.afl.rakuten.co.jp/...` リダイレクト URL
8. **`asurakuFlag` は廃止済み**（2024-07-01〜）。指定しても 0 固定
9. **`Items[].Item.{...}` ラッパは新エンドポイント既定でも残る**（実証済み）。`formatVersion=2` で平坦化可能
10. **`shopName` は自治体 + 委託業者の混在**: 自治体名抽出は `_MUNICIPALITY_RE`（市/町/村/区/県）を活用
11. **エンコーディング**: UTF-8 + URL エンコード必須

---

## 10. 出典・実証ログ

### 公式ドキュメント
- [IchibaItem/Search 公式（2026-04-01）](https://webservice.rakuten.co.jp/documentation/ichiba-item-search)
- [Rakuten Web Service: API 一覧](https://webservice.rakuten.co.jp/documentation)
- [API Test Form](https://webservice.rakuten.co.jp/explorer/api)
- [What is the request limit for each API?](https://webservice.faq.rakuten.net/hc/en-us/articles/900001974383)
- [Rakuten Web Service Terms of Service](https://webservice.rakuten.co.jp/guide/rule)
- [How to Display Branding & Give Credit](https://webservice.rakuten.co.jp/guide/credit)
- [App 新規登録](https://webservice.rakuten.co.jp/app/create)
- [楽天アフィリエイト](https://affiliate.rakuten.co.jp/)

### 実証検証ログ（2026-05-05）
- 旧エンドポイント + UUID applicationId → HTTP 400 wrong_parameter（再現可）
- 新エンドポイント + UUID + accessKey ヘッダ → HTTP 200（再現可）
- 新エンドポイント + `genreId=561023` → count=0（再現可）
- 新エンドポイント + `keyword=ふるさと納税 牡蠣` + `field=0` → 4,533 件
- 新エンドポイント + `keyword=ふるさと納税 蔵王 モッツァレラ` → 4 件（モッツァオ含む）

---

## 11. 本プロジェクトでのコードマッピング

| 仕様セクション | 該当ファイル |
|---|---|
| エンドポイント・パラメータ組立 | [`agent/src/makepizza_agent/furusato/rakuten_client.py`](../../../agent/src/makepizza_agent/furusato/rakuten_client.py) |
| ふるさと納税 keyword AND 結合 | 同上 `_with_furusato` |
| レスポンス → FurusatoItem 正規化（ラッパ両対応 + ふるさと納税 marker safety net） | [`agent/src/makepizza_agent/furusato/normalize.py`](../../../agent/src/makepizza_agent/furusato/normalize.py) |
| Firestore キャッシュ（7 日 TTL） | [`agent/src/makepizza_agent/furusato/cache.py`](../../../agent/src/makepizza_agent/furusato/cache.py) |
| 食材 → ingredient_id 解決 | [`agent/src/makepizza_agent/api/finalize.py`](../../../agent/src/makepizza_agent/api/finalize.py) `_resolve_ingredient_ids` |
| Recipe.furustoItems UI | [`src/components/recipe/RecipeView.tsx`](../../../src/components/recipe/RecipeView.tsx) |
| FURUSATO_INTEGRATION env スイッチ | [`agent/src/makepizza_agent/furusato/tool.py`](../../../agent/src/makepizza_agent/furusato/tool.py) `_is_disabled` |
| 環境変数 (`RAKUTEN_*`) | [`agent/.env.example`](../../../agent/.env.example) |

---

## 12. 残課題（要追加調査）

- 新エンドポイントの **GenreSearch / TagSearch 相当 API** が存在するか
- accessKey 欠落時の正確な HTTP ステータス（401 / 403 / 400 のいずれか）
- `formatVersion=2` の挙動が新エンドポイントで旧仕様と等価か
- キャッシュ保存日数の明文規定
- `genreId=561023` が新エンドポイントで count=0 を返す理由（楽天サポート問合せ）
