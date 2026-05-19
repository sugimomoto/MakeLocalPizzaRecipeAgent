# Slice 5 設計書 — 楽天ふるさと納税連動

> 本書は [`requirements.md`](requirements.md) を実装するための設計を記述する。
> 視覚デザインは [`design-request-prompt.md`](design-request-prompt.md) + Claude Design
> 成果物 ([`_reference/slice5-design/.../slice5-furusato.jsx`](../../_reference/slice5-design/makelocalpizzarecipe/project/slice5-furusato.jsx))
> を正本とする。Card B (sub-variant B1 inline) + 「取 寄 / FURUSATO」が採用案。

---

## 1. 設計の全体方針

### 1.1 5 つの設計判断

1. **3 層分離** — YAML キュレーション / 楽天 API は `refresh_furusato_cache.py` だけ
   が叩く / Firestore `furusato_items/{ingredientId}` は agent runtime / Web の双方
   が **read のみ**。retrospective の運用設計をそのまま踏襲。

2. **Web は Firestore 直 read** — `useFurusatoItems(ingredientIds: string[])` フックが
   並列 `onSnapshot` で複数 ingredient を購読し、結果を flatten → `donationAmount`
   昇順で並べる。BFF route は経由しない (rules で public read を許可)。

3. **on/off スイッチ 2 系統** — `MLPR_FURUSATO_INTEGRATION` (Python) と
   `NEXT_PUBLIC_FURUSATO_INTEGRATION` (Web)。両方 `off` で safe rollout、
   refresh script は走らないし UI からセクションが消える。

4. **UI 採用案 = Card B (B1 inline)** — Claude Design の出力で本命採用。
   - SectionHeader「取 寄 / FURUSATO」(明朝 14px / mono 9px のリズム)
   - RAKUTEN chip (muted) + 自治体 + 明朝タイトル + 生産者 + 寄附額 (mono) + 「取り寄せる ↗」(sumi BG)
   - 朱 CTA は **使わない** (既存「作ってみる →」と競合)

5. **詳細スナップショットは保存しない** — Slice 4 と同じ方針。`SavedRecipe` には
   `furusatoItems` を持たせない。`/library` から再訪したときは Firestore の最新を
   毎回 read する (寄付額・在庫の鮮度を優先)。

### 1.2 Slice 5 が決めること / 決めないこと

| カテゴリ | 決めること | 決めないこと (将来) |
|---|---|---|
| Web 取得 | `furusato_items/{ingredientId}` を直 onSnapshot | BFF route 経由化 (重ければ Slice 6) |
| UI 配置 | DetailClient の `<StoryCard>` 直前 | TOP / /library / 候補画面への配置 |
| キュレーション | 既存 3 県 (宮城・長野・高知) のみ | 47 県カバー (後続 1 県/週) |
| refresh | 手動 CLI のみ (`uv run python ...`) | cron 自動化 (Slice 7) |
| Secret | `.env` 直書き | Secret Manager (Slice 6) |
| 永続化 | Firestore cache のみ | SavedRecipe スナップショット |
| Rules | `furusato_items/*` public read / write false | より細かい access パターン |
| Mock | `MLPR_USE_MOCK_FURUSATO=true` で InMemory cache | 楽天 API レスポンスの hermetic fixture |

---

## 2. アーキテクチャ

### 2.1 全体図 (Slice 5 終了時点)

```
                ┌──────────────────────────────────┐
                │  Browser (Next.js client, 480px) │
                │  - DetailClient                   │
                │    └─ FurusatoSection (NEW)      │
                │       └─ useFurusatoItems(ids)    │
                └─────────┬────────────────────────┘
                          │ Firebase Web SDK
                          │  (onSnapshot)
                          ▼
            ┌─────────────────────────────────────┐
            │ Firestore (Emulator: localhost:8081) │
            │  furusato_items/{ingredientId}       │
            │  { ingredientId, items[], refreshedAt, ttlExpiresAt } │
            └─────────────────────────────────────┘
                          ▲
                          │ Admin SDK write (refresh only)
                          │
            ┌─────────────┴─────────────────────────┐
            │ refresh_furusato_cache.py (CLI)      │
            │   ↓ 1.05s/req                          │
            │ Rakuten Web Service (openapi...20260401) │
            │   - applicationId (UUID)              │
            │   - accessKey (pk_*)                  │
            │   - keyword AND「ふるさと納税」       │
            └───────────────────────────────────────┘
```

### 2.2 環境変数まとめ

| 変数 | 場所 | 値 | 用途 |
|---|---|---|---|
| `NEXT_PUBLIC_FURUSATO_INTEGRATION` | Web (.env) | `on` / `off` (既定 off) | off で UI 非表示 + read bypass |
| `MLPR_FURUSATO_INTEGRATION` | Python (.env) | `on` / `off` (既定 off) | off で tool が no-op |
| `MLPR_USE_MOCK_FURUSATO` | Python (.env) | `true` / `false` (既定 false) | true で InMemory cache + dummy items |
| `RAKUTEN_APPLICATION_ID` | Python (.env) | UUID | 必須 (refresh 実行時) |
| `RAKUTEN_ACCESS_KEY` | Python (.env) | `pk_*` | 必須 (refresh 実行時) |
| `RAKUTEN_AFFILIATE_ID` | Python (.env) | 任意 | 指定すると `affiliateUrl` が付く |

---

## 3. データモデル

### 3.1 Firestore コレクション

```
furusato_items/
  {ingredientId}/                  ← 例: 'miyagi-oyster'
    ingredientId: string
    items: FurusatoItem[]          ← 最大 3 件 (refresh CLI の --max-items 既定)
    refreshedAt: Timestamp
    ttlExpiresAt: Timestamp        ← refreshedAt + 7 日
```

**設計判断:**
- ドキュメント ID = `ingredientId` (1 食材 = 1 ドキュメント)
- Items は配列で保存 (1 食材につき最大 3 件、Slice 5 では十分)
- TTL は **アプリケーション側で評価** (Firestore TTL 機能は使わない、refresh で確実に上書きされるため)
- TTL 切れ doc は `useFurusatoItems` 側で **silently skip** (UI 非表示)

### 3.2 ドメイン型 `FurusatoItem`

```ts
// src/domain/furusato.ts (NEW)
export type FurusatoItem = {
  itemId: string;            // 楽天 itemCode
  ingredientId: string;      // 紐づく ingredient id
  platform: 'rakuten';       // 拡張余地のため
  title: string;             // 「【ふるさと納税】〇〇県〇〇町 ...」
  municipality: string;      // 「宮城県松島町」
  producer: string | null;   // 「松島漁業協同組合」(任意)
  donationAmount: number;    // 寄付額 (円)
  url: string;               // 楽天 itemUrl
  affiliateUrl: string | null; // 楽天 affiliateUrl (任意)
  imageUrl: string | null;   // medium image (任意)
  inStock: boolean;          // 楽天 itemStatus 由来
  fetchedAt: string;         // ISO datetime
};
```

```python
# agent/src/.../domain/furusato.py (NEW) - 既存 domain にぶら下げ
class FurusatoItem(BaseModel):
    itemId: str
    ingredientId: str
    platform: Literal['rakuten'] = 'rakuten'
    title: str
    municipality: str
    producer: str | None = None
    donationAmount: int = Field(gt=0)
    url: str
    affiliateUrl: str | None = None
    imageUrl: str | None = None
    inStock: bool = True
    fetchedAt: str  # ISO
```

### 3.3 ingredients YAML 拡張

```yaml
# agent/data/ingredients.yaml (既存) に optional フィールド追加
- id: miyagi-seri
  name: せり(根付き)
  prefecture: 宮城
  search_query: せり 宮城  # ← NEW (optional)。連体修飾を回避する検索用クエリ
```

- 各 ingredient に optional `search_query: str | None = None`
- ない場合は refresh script が `name` をそのまま keyword に使う
- 0/低件数だった食材だけ dry-run の結果を見て手当する (retrospective 実績)

### 3.4 Security Rules 追加

```javascript
// firestore.rules に追加
service cloud.firestore {
  match /databases/{database}/documents {
    // 既存: users/{uid}/savedRecipes (Slice 4) ...

    match /furusato_items/{ingredientId} {
      allow read: if true;         // 公開データ
      allow write: if false;       // Admin SDK のみ (refresh script)
    }
  }
}
```

---

## 4. Python レイヤ (agent/)

### 4.1 モジュール構成

```
agent/src/makelocal_agent/
  domain/
    furusato.py                 ← FurusatoItem Pydantic
  furusato/
    __init__.py
    rakuten_client.py           ← 楽天 IchibaItem/Search API
    normalize.py                ← raw → FurusatoItem
    cache.py                    ← Protocol + InMemory + Firestore
    tool.py                     ← lookup_items_by_ingredient_id
  deps.py                       ← get_furusato_cache() を追加
  config.py                     ← env 読み込み拡張

agent/scripts/
  refresh_furusato_cache.py     ← 手動 CLI
```

**前回プロジェクトからの差分**:
- パッケージ名 `makepizza_agent` → `makelocal_agent` (本プロジェクトの命名)
- `domain.py` 単一ファイル → `domain/` ディレクトリ (本プロジェクトの構造)
- `data/loader.py` → `data/ingredients.py` (本プロジェクトの命名)

### 4.2 rakuten_client.py の要点 (前回流用)

```python
RAKUTEN_API_BASE = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401"
_MIN_INTERVAL_SEC = 1.05  # レート制限 1 req/s + 5% margin
FURUSATO_KEYWORD = "ふるさと納税"

class RakutenClient:
    def __init__(self, application_id: str, access_key: str, affiliate_id: str | None = None, ...): ...
    async def search_furusato(self, keyword: str, *, max_items=3, max_donation_yen=None) -> list[dict]:
        # keyword に「ふるさと納税」を AND 結合
        # accessKey ヘッダ送信
        # 1.05s 間隔で順次叩く
```

### 4.3 normalize.py の要点

- `Items[]` の `{"Item": {...}}` ラップ形式 / 平坦形式の両方を許容
- 必須フィールド (`itemCode` / `itemName` / `itemPrice` / `itemUrl`) が無ければ `None`
- `「【ふるさと納税】〇〇県〇〇町」` regex で自治体を抽出
- safety net: `「ふるさと納税」` が商品名に無ければ弾く (keyword AND の取りこぼし防止)

### 4.4 cache.py の要点

```python
CACHE_COLLECTION = "furusato_items"
DEFAULT_TTL_DAYS = 7

class FurusatoCache(Protocol):
    async def get(self, ingredient_id: str) -> list[FurusatoItem] | None: ...
    async def set(self, ingredient_id: str, items: list[FurusatoItem], *, ttl_days: int = 7) -> None: ...

class InMemoryFurusatoCache: ...
class FirestoreFurusatoCache: ...
```

### 4.5 refresh_furusato_cache.py の使い方

```bash
# dry-run (cache に書かず stdout に出力、件数とタイトルを可視化)
cd agent
uv run python scripts/refresh_furusato_cache.py --dry-run

# InMemory (Firestore 不要、動作確認用)
uv run python scripts/refresh_furusato_cache.py --in-memory

# 特定食材だけ
uv run python scripts/refresh_furusato_cache.py --only miyagi-oyster

# 本番想定 (Slice 6 で Cloud Run Jobs 化)
RAKUTEN_APPLICATION_ID=... RAKUTEN_ACCESS_KEY=... \
  GOOGLE_CLOUD_PROJECT=mlpr-local \
  FIRESTORE_EMULATOR_HOST=localhost:8081 \
  uv run python scripts/refresh_furusato_cache.py
```

---

## 5. Web レイヤ (Next.js)

### 5.1 モジュール構成

```
src/
  domain/
    furusato.ts                ← FurusatoItem TS 型 + Zod schema
  lib/
    firebase/
      furusato.ts              ← Firestore CRUD ヘルパ (read-only)
  hooks/
    use-furusato-items.ts      ← onSnapshot で N 個並列購読
  components/
    furusato/
      FurusatoSection.tsx      ← セクション root
      FurusatoSection.module.css
      FurusatoCard.tsx         ← Card B inline
      FurusatoCard.module.css
      FurusatoSkeleton.tsx     ← loading state
      RakutenCredit.tsx        ← フッタクレジット
      RakutenCredit.module.css

app/recipes/[candidateId]/_components/
  DetailClient.tsx             ← FurusatoSection を <StoryCard> の前に挿入
```

### 5.2 `useFurusatoItems(ingredientIds: string[])` フック

```ts
type FurusatoItemsState = 'loading' | 'ready' | 'disabled';

type UseFurusatoItemsResult = {
  state: FurusatoItemsState;
  items: FurusatoItem[];        // donationAmount 昇順、TTL 切れは除外
  error: Error | null;
};

export function useFurusatoItems(ingredientIds: string[]): UseFurusatoItemsResult {
  // NEXT_PUBLIC_FURUSATO_INTEGRATION='off' なら { state: 'disabled', items: [], error: null }
  // ingredientIds が空なら { state: 'ready', items: [] }
  // 各 id について onSnapshot を張り、結果を accumulate → flatten + sort
  // TTL 切れ doc (ttlExpiresAt < now) は silently skip
}
```

### 5.3 FurusatoSection (採用 = Card B inline)

```tsx
'use client';

export type FurusatoSectionProps = {
  ingredientIds: string[];
  /** loading 中も SectionHeader を出すか (true) or 完全非表示 (false)。既定 true */
  showHeaderWhileLoading?: boolean;
};

export function FurusatoSection({ ingredientIds }: FurusatoSectionProps) {
  const { state, items, error } = useFurusatoItems(ingredientIds);

  // disabled (env off) → 完全非表示
  if (state === 'disabled') return null;
  // empty 案 X: items 0 件なら非表示 (refresh 未走時のみ '準備中' を出すかは Phase 後半検討)
  if (state === 'ready' && items.length === 0 && !error) return null;

  return (
    <section className={styles.section}>
      <FuruSectionHeader jp="取 寄" en="FURUSATO" />
      <p className={styles.subcopy}>このレシピの食材は、ふるさと納税の返礼品としても入手できます。</p>

      {state === 'loading' && (
        <div className={styles.list}>
          <FurusatoSkeleton />
          <FurusatoSkeleton />
        </div>
      )}

      {state === 'ready' && items.length > 0 && (
        <div className={styles.list}>
          {items.map((it) => <FurusatoCard key={it.itemId} item={it} />)}
        </div>
      )}

      {error && (
        <ErrorBox message="楽天ウェブサービスに接続できませんでした。時間をおいて再度お試しください。" />
      )}

      <RakutenCredit />
    </section>
  );
}
```

### 5.4 FurusatoCard (Card B inline 仕様)

| 要素 | 仕様 |
|---|---|
| Container | `kinari` BG / radius 12 / padding 12 / hairline border / shadow 軽 |
| Layout | flex row, gap 12, align-items: flex-start |
| Thumbnail | 72×72 / radius 8 / inset hairline / `imageUrl` or 🍕 fallback |
| Top row | RAKUTEN chip (muted) + 自治体 (gothic 10.5 sumi-muted) |
| Title | mincho 13 / 600 / line-clamp 2 / sumi |
| Producer | gothic 11 / sumi-soft (任意) |
| Bottom row | 寄附 mono 9 muted + 金額 mono 13 sumi + 「円〜」gothic 11 sumi-soft + 在庫切れバッジ (有無) + 「取り寄せる ↗」(右端) |
| CTA | sumi BG / kinari color / radius 999 / padding 5×10 / gothic 11/600 + ↗ icon |
| クリック | `<a href={affiliateUrl ?? url} target="_blank" rel="noopener noreferrer sponsored">` でカード全体をリンク化 |
| 在庫切れ (`inStock=false`) | 「在庫切れ」バッジ表示 + opacity 0.65 + CTA は disabled スタイル |

### 5.5 RakutenChip / 「取り寄せる ↗」ボタン

```tsx
// 内製アイコンコンポーネント (前回プロジェクトと同じ ↗ SVG)
function ExtLinkIcon({ size = 10, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" aria-hidden>
      <path d="M3 2H8V7M8 2L2 8" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
```

### 5.6 RakutenCredit (フッタクレジット)

```tsx
<div className={styles.credit}>
  <RakutenMark />  {/* R を四角枠で囲んだ小さな SVG (公式ロゴは使わない) */}
  <span>POWERED BY 楽天ウェブサービス</span>
</div>
```

- セクション内フッタ (border-top: hairline / margin-top 14 / padding-top 10)
- mono 9.5 / sumi-muted / letter-spacing 2.5
- 楽天規約 §8 必須

### 5.7 DetailClient への組込

```diff
  <section className={styles.section}>
    <SectionLabel jp="手 順" {...} />
    <StepList steps={stream.steps} />
  </section>

+ <FurusatoSection ingredientIds={furusatoIngredientIds} />

  <StoryCard story={stream.story} />
```

**`furusatoIngredientIds` の決定方法 (Slice 5 simple 版):**

- Detail の `pending.ingredients` (= ユーザが選んだ食材 ID 配列) をそのまま渡す
- これは "選択食材 = ふるさと納税で探したい食材" のシンプルなマッピング
- Slice 6+ で「`stream.materials` に紐づく ingredient_id を抽出」する高度化を検討

---

## 6. Mock / オフライン開発

### 6.1 Web 側 Mock

- `NEXT_PUBLIC_FURUSATO_INTEGRATION=off` で `useFurusatoItems` が即 `{ state: 'disabled' }` を返す
  → FurusatoSection は `null` を返す
- Firestore Emulator に dummy data を seed する手順は README に追記

### 6.2 Python 側 Mock

- `MLPR_USE_MOCK_FURUSATO=true` で `get_furusato_cache()` が `InMemoryFurusatoCache` を返す
- 単体テスト・E2E でも実 API 不要

### 6.3 シード用ダミーデータ (Web で動作確認するため)

- Firestore Emulator UI から手動で `furusato_items/miyagi-oyster` 等にダミー doc を入れる手順を README に追記
- または `scripts/seed-furusato-emulator.ts` を用意して 3 県分の dummy データを一括投入 (推奨)

---

## 7. Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/savedRecipes/{candidateId} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // Slice 5: ふるさと納税キャッシュ (商品情報は公開データ)
    match /furusato_items/{ingredientId} {
      allow read: if true;
      allow write: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Rules テスト** (`tests/rules/firestore-rules.test.ts` に追加):
- 未認証で `furusato_items/...` が read 可
- サインイン済でも `write` 不可

---

## 8. CI 統合

### 8.1 既存 `rules` job への追加

- `tests/rules/firestore-rules.test.ts` に Slice 5 用 test 2 件追加 (上記)
- `firebase emulators:exec` の中で実行されるので、emulator host の env 上書きはそのまま使える

### 8.2 既存 `python` job への追加

- `agent/tests/test_furusato_*.py` (rakuten_client / normalize / cache / tool) を Python 側で動かす
- 楽天 API 実通信は **モック** で覆う (httpx.MockTransport で record/replay 不要、単純 fixture で可)

### 8.3 既存 `e2e` job への影響

- `NEXT_PUBLIC_FURUSATO_INTEGRATION=off` を CI の `.env` に書いておけば E2E は影響なし
- E2E で FurusatoSection を verify したい場合は Slice 6+ で seed step を追加

---

## 9. 段階的ロールアウト

| Phase | スイッチ | 状態 |
|---|---|---|
| Phase 0 (Slice 5 開発中) | `off` | UI 非表示 / Python tool no-op |
| Phase 1 (Slice 5 マージ後) | `off` | 同上、リスクゼロでマージ |
| Phase 2 (refresh 確認後) | `on` (Web) + dummy or refresh 済 cache | UI に表示開始 |
| Phase 3 (Slice 6 デプロイ後) | `on` (本番) + Cloud Run Jobs cron | フル運用 |

---

## 10. 既知のリスクと緩和

| リスク | 緩和策 |
|---|---|
| 楽天 API の IP ホワイトリスト要求 | refresh 実行環境 (devcontainer / 開発機) の IP を applicationId に登録。emit_event でログ |
| 0/低件数の食材が出る | `--dry-run` で可視化 → `search_query` 手当。retrospective 実績で 45 中 4 件 |
| Firestore Emulator にデータが無く UI が空 | seed スクリプトを用意。または `--in-memory --dry-run` で確認 |
| 朱 CTA との視覚衝突 | Card B の CTA は sumi BG 固定 (デザイン §1.1 で禁止事項) |
| 楽天規約 §8 違反 | `RakutenCredit` を `FurusatoSection` 内に必ず置く設計、テスト書く |
| 詳細レシピの ingredient_id と YAML id の乖離 | Slice 5 では `pending.ingredients` (= 選択時の ID) をそのまま渡すのでこの問題は起きない |

---

## 11. 改訂履歴

| 日付 | 版 | 変更内容 |
|---|---|---|
| 2026-05-19 | 1.0 | 初版作成 (Claude Design 出力 Card B inline 採用版) |
