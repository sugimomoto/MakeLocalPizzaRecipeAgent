# Slice 8(仮) 設計 — ENRO 機材ガイド + 機材プロファイル

> 対応 requirements: [requirements.md](./requirements.md) v1.0
> 対応デザイン: [`design/slice8-screens.html`](../../design/slice8-screens.html) /
> [`design/slice8-screens.jsx`](../../design/slice8-screens.jsx) /
> [`design/slice8-app.jsx`](../../design/slice8-app.jsx)
> 想定リリース: v0.8.0

---

## 0. 概観

Slice 8 では 3 つの新規 / 改修ブロックを追加する:

| ブロック | 種類 | 影響範囲 |
| --- | --- | --- |
| A. `/equipment` ガイドページ | 新規ルート (静的 LP) | フロントエンドのみ |
| B. 機材プロファイル切替 UI + 永続化 | 新規 (BottomSheet + Toast) | フロント + Tap2 ヘッダ + Dropdown |
| C. `oven_profile` のプロンプト統合 | 既存 API + Agent 改修 | Next.js API + Python Agent |

任意ブロックとして:
- D. 詳細画面の機材バッジ (温度・時間メタの直下)
- E. TOP の朱ピル動線 (Slice 8 主役の `/equipment` 誘導、案 B)

---

## 1. データ・型・永続化

### 1.1 ドメイン型 (TypeScript)

新規ファイル: `src/domain/oven-profile.ts`

```ts
export type OvenProfileId = 'enro_450c_90s' | 'home_oven_280c_10m';

export type OvenProfile = {
  id: OvenProfileId;
  /** 表示名 (jp) */
  jp: string;
  /** モノ表記 (英・スペック) */
  en: string;
  /** 絵文字アイコン */
  emoji: '🔥' | '🍳';
  /** 推奨温度範囲 (人間向け文字列、UI と LLM 双方で利用) */
  tempLine: string;        // '400〜450°C' / '250〜300°C'
  /** 推奨焼成時間 (人間向け文字列) */
  timeLine: string;        // '90〜120 秒' / '8〜15 分'
  /** カード/シート用の説明 */
  desc: string;
  /** デフォルトかどうか */
  isDefault?: boolean;
};

export const OVEN_PROFILES: Record<OvenProfileId, OvenProfile> = { /* ... */ };
export const DEFAULT_OVEN_PROFILE_ID: OvenProfileId = 'enro_450c_90s';
```

### 1.2 ドメイン型 (Python Agent 側)

新規ファイル: `agent/src/makelocal_agent/domain/oven_profile.py`

```python
OvenProfileId = Literal['enro_450c_90s', 'home_oven_280c_10m']

@dataclass(frozen=True)
class OvenProfile:
    id: OvenProfileId
    jp_label: str
    temp_line: str
    time_line: str
    prompt_directive: str  # LLM へ渡す機材前提文 (温度・水分・厚さ等)
```

`prompt_directive` の中身は **§3.1** を参照。

### 1.3 永続化

新規ファイル: `src/lib/localstorage/oven-profile.ts`

`src/lib/localstorage/locale.ts` と同パターンで以下の API を提供:

- `OVEN_PROFILE_STORAGE_KEY = 'mlpr.ovenProfile.v1'`
- `readOvenProfile(): StoredOvenProfile | null` — SSR セーフ、壊れた JSON 自動破棄
- `writeOvenProfile(id: OvenProfileId, now?: number): void`
- `clearOvenProfile(): void`

`StoredOvenProfile = { id: OvenProfileId; selectedAt: number }`

### 1.4 React フック

新規ファイル: `src/hooks/use-oven-profile.ts`

```ts
export function useOvenProfile(): {
  profile: OvenProfile;       // localStorage に無ければ DEFAULT を返す
  profileId: OvenProfileId;
  setProfile: (id: OvenProfileId) => void;
  isHydrated: boolean;        // SSR → CSR 切替の hydrate ガード
};
```

- 内部で `useState` + `useEffect` で localStorage を読み出し
- `setProfile` は localStorage 書き込み + state 更新 + `'mlpr-oven-profile-changed'` カスタムイベント発火 (別タブ・別コンポーネント同期用)
- hydrate 前は DEFAULT を返し、`isHydrated=false`。Header の表示はマウント後に切り替え

---

## 2. ルーティング・画面

### 2.1 `/equipment` (新規 LP)

新規ディレクトリ: `app/equipment/`

- `page.tsx` — Server Component。`'use client'` 不要。`metadata.title = '機材ガイド | ふるさとピザ帳'`
- `_components/EquipmentClient.tsx` — Client Component (CTA クリック時の navigation 等)
- `_components/EquipmentHero.tsx` / `DeveloperVoice.tsx` / `Benefits.tsx` / `UsageSection.tsx` / `CompareTable.tsx` / `YoutubeList.tsx` / `HomeOvenSection.tsx` / `FinalCta.tsx` / `FooterNotice.tsx`
- 各セクションを 1 ファイルずつに分割 (slice7-feedback の `_components/` 分割と同パターン)
- 認証不要、CSP は既存と同等。`rel="sponsored noopener noreferrer"` を CTA に
- `app/layout.tsx` の HeaderRow は **TOP 同様、`/equipment` でも非表示** (LP の専用ブランドバーを使う)
- Hero 画像は `public/equipment/enro-hero.png` に配置 (next/image の `<Image>`)

#### 2.1.1 セクション構成 (デザインに準拠)

`design/slice8-screens.jsx` 内の以下を 1:1 で React/Next.js に移植:
- `<HeroSection>` → `<EquipmentHero>`
- `<DeveloperVoice>`
- `<BenefitsSection>` (3 体験変化、中央のみ墨地反転)
- `<UsageSection>` (5 ステップ + 比較表 + YouTube)
- `<HomeOvenSection>`
- `<FinalCtaSection>`
- `<FooterNotice>` (アフィリ注記)

#### 2.1.2 楽天 ENRO リンクとアフィリエイト

- 環境変数: `NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID` (公開可能。`pid-xxxxxxxx` 形式)
- ヘルパ: `src/lib/affiliate/rakuten.ts`
  - `buildEnroAffiliateUrl(): string` — affiliate ID を base URL に注入
  - 未設定環境では素 URL (`https://www.rakuten.co.jp/enro/`) にフォールバック
- Secret は **公開可能** (楽天アフィリエイト ID は URL 末尾に載せる類のもの)。Secret Manager ではなく `.env.production` / Cloud Run env で OK

### 2.2 機材プロファイル切替 (BottomSheet)

新規コンポーネント: `src/components/oven/OvenProfileSheet.tsx`

- 設計: [`design/slice8-app.jsx` `OvenProfileSheet`](../../design/slice8-app.jsx)
- iOS bottom sheet (角丸 22px、ドラッグハンドル、背面ディム 0.45)
- 2 ラジオオプション + 確定 CTA + `/equipment` 誘導行
- 確定時:
  1. `writeOvenProfile(selectedId)`
  2. Toast 表示 (`useToast` 利用、4 秒、`取消` ボタンで undo)
  3. シートを閉じる
- 取消時: ロールバック (前の id を `writeOvenProfile`)
- 背面 click / Esc / × ボタン / ハンドル下スワイプ で破棄 (= 仮選択を捨てる)

`src/components/oven/OvenProfileToast.tsx` は **不要** — 既存 `useToast` (src/hooks/use-toast.tsx) を流用し、Toast 文言生成だけ別関数化する。

#### 2.2.1 配置 (案 A + 案 B のハイブリッド)

- **案 A (常設)**: HeaderRow Dropdown 内の項目「🔥 機材ガイド」(副題で現プロファイル名)。Dropdown 項目クリックで `/equipment` に遷移するのは既定通り。**シート起動はしない** (Dropdown はメニュー、設定操作は別 UI が筋)
- **案 B (Tap2 ヘッダ)**: 食材選択画面のヘッダ右に独立セレクタ `🔥 ENRO ▾` を配置。タップで `OvenProfileSheet` を開く

`/ingredients/_components/LocaleHeader.tsx` 既存 (📍 地元) と並べる。

### 2.3 HeaderDropdown V3 (Slice 7 改修)

既存ファイル: `src/components/shell/HeaderDropdown.tsx`

変更:
- `ITEMS` 配列に 3 番目として `equipment` 項目を追加
  - icon: '🔥', jp: '機材ガイド', en: 'EQUIPMENT', route: '/equipment'
  - 副題: `🔥 現在: ${profileJp}` (= en の代わりに副題に切替)
  - `isNew` フラグ (初回露出のみ NEW バッジ、`localStorage.equipmentLinkSeen=true` で抑制)
- `currentRoute` の型を `'/library' | '/journal' | '/equipment'` に拡張
- 既存 CSS (`HeaderDropdown.module.css`) に subtitle 用クラス追加

### 2.4 (任意・後続) 詳細画面の機材バッジ

`src/components/recipe/MetaStrip.tsx` 既存に、`oven_profile` を読んで以下を追加:
- ピル型バッジ (`bg-shu-tint`, `text-shu-deep`) 
- ラベル: `🔥 ENRO 機材プロファイル` or `🍳 家庭用オーブン 機材プロファイル` (後に「の前提」を付与)
- `<Link href="/equipment">` でラップ
- Slice 8 のスコープでは**実装は任意**(コア機能完了後に時間があれば)

### 2.5 (任意・後続) TOP の朱ピル

`app/_components/TopClient.tsx` 既存の主 CTA 直下に、`設計 案 B` を実装:
- 3 つのピル横並び (📔 ピザ帳 / 📓 振り返り帳 / 🔥 機材ガイド)
- 機材ガイドのみ朱トーン (`bg-shu/8`, `text-shu-deep`)
- Slice 8 スコープでは**実装は任意**

---

## 3. プロンプト統合 (`oven_profile`)

### 3.1 プロンプト命令文

`agent/src/makelocal_agent/domain/oven_profile.py` に `prompt_directive` を定義:

#### `enro_450c_90s` (デフォルト)

```
【機材前提】
400〜450°C / 90〜120 秒で焼成できる ENRO 電気ピザ窯を前提に最適化してください。
- meta.bakingTemp は 400〜450°C の範囲で
- meta.duration は焼成 + 準備込みで 30〜45 分前後
- 生地は中央 4mm / 縁 8mm 目安の薄手
- トッピングの水分は予め水切りすること
- チーズは焼成終盤に投入想定
```

#### `home_oven_280c_10m`

```
【機材前提】
250〜300°C 上限の家庭用オーブンを前提に再生成してください。
- meta.bakingTemp は 250〜300°C の範囲で
- 焼成時間は 8〜15 分
- 生地はやや厚め (中央 6mm / 縁 10mm)、加水率は低め推奨
- 水分の多い具は予め水切り / 加熱して使う
- ナポリ寄りではなく、家庭オーブンで再現可能なレシピに調整
```

### 3.2 プロンプトビルダー改修

#### `agent/.../agents/detail_agent.py`

`build_detail_prompt()` に `oven_profile: OvenProfile` を引数追加 (default は ENRO):

```python
def build_detail_prompt(
    *, locale, selected, candidate,
    oven_profile: OvenProfile = OVEN_PROFILES['enro_450c_90s'],
) -> str:
    return (
        f"地元: {locale.prefecture}\n"
        ...
        f"\n{oven_profile.prompt_directive}\n"
        f"\n【出力ルール】\n"
        f"- meta.bakingTemp: '{oven_profile.temp_line.split('〜')[0]}°C' のような目安温度\n"
        ...
    )
```

#### `agent/.../agents/prompt.py` (候補 3 案用)

候補画面の軽量出力には焼成温度を含まないので、`oven_profile` は **不要**(Slice 8 では詳細画面のみ統合)。
ただし、`why` の論理付けに「機材前提」が効くと将来便利なので、引数として受け取れる構造だけは入れておく(現状は no-op)。

### 3.3 API レイヤ (Python FastAPI)

`agent/.../routes/recipes.py`:

```python
class GenerateRecipeRequest(BaseModel):
    localeId: str
    ingredients: list[str]
    candidate: Candidate
    guestSessionId: str | None = None
    ovenProfile: OvenProfileId = 'enro_450c_90s'  # ← 追加 (省略時はデフォルト)
```

`generate_recipe_detail()` → `run_recipe_detail()` まで `oven_profile` を引き回す。

### 3.4 Next.js API レイヤ

`app/api/recipes/[candidateId]/route.ts` で、

- Request body に `ovenProfile: OvenProfileId | undefined` を受け取る
- Python Agent への POST body に転送
- 未指定なら省略 (Python 側で default に解決)

### 3.5 フロント呼び出し側

`src/hooks/use-recipe-detail-stream.ts` 等で、`fetch` 呼び出し直前に `readOvenProfile()` を読んで body に注入:

```ts
const stored = readOvenProfile();
body.ovenProfile = stored?.id ?? DEFAULT_OVEN_PROFILE_ID;
```

---

## 4. CSS / デザインシステム

- 既存トークン (`src/styles/tokens.css` 等の washi / kinari / sumi / shu / matcha / yamabuki) を再利用
- 新規色は追加しない
- `/equipment` は LP なので **Tailwind / CSS Modules** どちらでも OK だが、既存と揃えて CSS Modules で統一
- `BottomSheet` は新規プリミティブ。`src/components/primitives/BottomSheet.module.css` を新設

### 4.1 BottomSheet primitive

新規ファイル: `src/components/primitives/BottomSheet.tsx` + `BottomSheet.module.css`

- props: `open: boolean`, `onClose: () => void`, `children`, `aria-label`
- 背面ディム + 角丸 22px の sheet + ドラッグハンドル
- Esc / 背面 click / ハンドル下スワイプ(タッチイベント) で `onClose`
- アクセシビリティ: `role="dialog" aria-modal="true"`
- 将来の機材プロファイル以外の用途 (フィードバック確認シート等) でも流用可能なよう汎用化

---

## 5. テスト方針

### 5.1 単体テスト (Vitest)

- `src/lib/localstorage/oven-profile.test.ts` — locale.test.ts と同パターン
- `src/hooks/use-oven-profile.test.tsx` — hydrate / 切替 / 別タブ同期
- `src/lib/affiliate/rakuten.test.ts` — env 有無での URL 生成

### 5.2 コンポーネントテスト (RTL)

- `OvenProfileSheet.test.tsx` — 選択 / 確定 / 取消 / Esc / 背面 click
- `HeaderDropdown.test.tsx` 既存に「機材ガイドが表示される」「現在プロファイルが副題に出る」追加

### 5.3 Python pytest

- `tests/test_oven_profile.py` — `OVEN_PROFILES` 完全性、`prompt_directive` 内容のスナップショット
- `tests/test_detail_agent_prompt.py` 既存に oven_profile 別の prompt 出力スナップショットを追加

### 5.4 E2E は Slice 8 ではスコープ外

既存 Playwright / Vitest スイートが緑のままで OK。新規 E2E は追加しない。

---

## 6. ロールアウト・互換性

- localStorage に未設定なユーザは自動的にデフォルト (ENRO) で動作 — **互換性影響なし**
- 既存セッション中のレシピ詳細は再生成しない (一度生成された記録は変えない)
- Firestore スキーマ変更なし (saved-recipe / feedback には oven_profile を保存しない、生成時のスナップショットだけ candidate.meta に焼き込まれる)
- 必要なら将来 Slice で `savedRecipe.ovenProfileSnapshot` を追加する余地は残す

---

## 7. 影響を受けるファイル一覧

### 新規

- `app/equipment/page.tsx`
- `app/equipment/_components/*` (Hero / DeveloperVoice / Benefits / Usage / Compare / Youtube / HomeOven / FinalCta / FooterNotice)
- `app/equipment/_components/EquipmentClient.tsx` (LP 全体のクライアント側ラッパが必要なら)
- `app/equipment/page.module.css` (LP 用)
- `src/domain/oven-profile.ts`
- `src/lib/localstorage/oven-profile.ts`
- `src/lib/localstorage/oven-profile.test.ts`
- `src/lib/affiliate/rakuten.ts`
- `src/lib/affiliate/rakuten.test.ts`
- `src/hooks/use-oven-profile.ts`
- `src/hooks/use-oven-profile.test.tsx`
- `src/components/oven/OvenProfileSheet.tsx` + module.css + test
- `src/components/oven/OvenProfileSelector.tsx` (Tap2 ヘッダ右に置く小さなセレクタ) + module.css + test
- `src/components/primitives/BottomSheet.tsx` + module.css
- `public/equipment/enro-hero.png` (デザインバンドルからコピー)
- `agent/src/makelocal_agent/domain/oven_profile.py`
- `agent/tests/test_oven_profile.py`

### 改修

- `src/components/shell/HeaderDropdown.tsx` + module.css + test — 機材ガイド項目追加
- `src/lib/storage-keys.ts` — `OVEN_PROFILE_STORAGE_KEY` 言及だけ追加 (実体は別ファイル)
- `app/ingredients/_components/LocaleHeader.tsx` — 右側に OvenProfileSelector 配置
- `app/api/recipes/[candidateId]/route.ts` — body 転送
- `src/hooks/use-recipe-detail-stream.ts` — body に ovenProfile 注入
- `agent/src/makelocal_agent/routes/recipes.py` — `ovenProfile` 受信
- `agent/src/makelocal_agent/agents/recipe_orchestrator.py` — 引数引き回し
- `agent/src/makelocal_agent/agents/detail_agent.py` — `build_detail_prompt` 拡張
- `agent/tests/test_detail_agent_prompt.py` — スナップショット追加
- `docs/product-requirements.md` — F13 / F14 追加 (実装完了後)
- `docs/glossary.md` — 機材プロファイル / ENRO 追加

### 任意 (時間があれば)

- `src/components/recipe/MetaStrip.tsx` — 機材バッジ追加
- `app/_components/TopClient.tsx` — 朱ピル追加

---

## 8. オープン論点 (実装中に判断)

- **BottomSheet のスワイプ判定**: 簡易実装 (タッチ Y 軸 30px 以上で close) で十分。React-aria 等の重い依存は入れない
- **TOP の朱ピル**: 案 B 推奨だが、TopClient.tsx の Hero 構成と相性が悪ければ案 A (フッター) にフォールバック
- **NEW バッジの抑制条件**: `localStorage.equipmentLinkSeen` を立てるタイミング — Dropdown を開いて機材ガイド項目に hover/focus した瞬間か、`/equipment` 訪問時か → **訪問時にコミット**で確定 (露出だけで消すと "気付かないうちに消える" 問題)

---

## 9. 改訂履歴

| 日付 | 版 | 変更 |
| --- | --- | --- |
| 2026-05-25 | 1.0 | 初版。requirements.md v1.0 + design package (`slice8-screens.*`) を反映 |
