# Slice 7 設計 — 「作ってみた」フィードバック + 振り返り帳 + Header 統一 + ブランド確立

> 本書は [`requirements.md`](requirements.md) の機能要件を実装に落とすための設計を定義する。
> Claude Design からの [`design/slice7-screens.jsx`](../../design/slice7-screens.jsx) を「真の真」
> としてコンポーネント / Firestore schema / hooks API を起こす。

## 0. ファイル構成 (全 23 ファイル新規 + 11 ファイル更新)

```
app/
├── layout.tsx                                  ← 更新: metadata.title, favicon
├── page.tsx                                    ← 更新: TopRefresh 風に
├── _components/
│   └── TopClient.tsx                           ← 更新: FurusatoMark + ブランドキャプション
├── library/
│   └── _components/
│       └── LibraryClient.tsx                   ← 更新: HeaderRow + CrossLink + cooked badge
├── journal/                                    ← NEW
│   ├── page.tsx
│   ├── _components/
│   │   ├── JournalClient.tsx
│   │   └── JournalClient.module.css
└── feedback/                                   ← NEW
    └── [candidateId]/
        ├── page.tsx
        ├── _components/
        │   ├── FeedbackClient.tsx
        │   └── FeedbackClient.module.css

src/
├── components/
│   ├── brand/
│   │   ├── FurusatoMark.tsx                    ← NEW (variant A/B/C/D)
│   │   └── Wordmark.tsx                        ← NEW (horizontal/stacked/vertical)
│   ├── shell/
│   │   ├── HeaderRow.tsx                       ← NEW
│   │   ├── HeaderRow.module.css                ← NEW
│   │   ├── HeaderDropdown.tsx                  ← NEW
│   │   └── HeaderDropdown.module.css           ← NEW
│   ├── journal/
│   │   ├── JournalCard.tsx                     ← NEW
│   │   ├── JournalCard.module.css              ← NEW
│   │   ├── JournalEmpty.tsx                    ← NEW
│   │   ├── StatTile.tsx                        ← NEW
│   │   └── StarRow.tsx                         ← NEW (read-only)
│   ├── feedback/
│   │   ├── StarInput.tsx                       ← NEW (interactive)
│   │   ├── DotsInput.tsx                       ← NEW (5-step interactive)
│   │   ├── ChipGroup.tsx                       ← NEW (multi-select with cap)
│   │   ├── GuestCountInput.tsx                 ← NEW
│   │   └── CameraPlaceholder.tsx               ← NEW (preview only)
│   ├── shared/
│   │   └── CrossLink.tsx                       ← NEW (library ↔ journal pill)
│   └── auth/
│       └── AvatarButton.tsx                    ← 更新 (Dropdown 開閉トリガに変身)
├── hooks/
│   ├── use-feedback-draft.ts                   ← NEW (debounced auto-save)
│   ├── use-feedback.ts                         ← NEW (subscribe + save + delete)
│   ├── use-header-dropdown.ts                  ← NEW (open/close + keyboard)
│   └── use-saved-recipes-journal.ts            ← NEW (filter: hasFeedback only)
├── lib/firebase/
│   ├── feedback.ts                             ← NEW (saveFeedback / draft / subscribe)
│   └── saved-recipe.ts                         ← 更新 (feedback field normalize)
├── domain/
│   └── feedback.ts                             ← NEW (type definitions)
└── components/recipe/
    └── DetailMakeCTA.tsx                       ← NEW (案 A: ハートとセットのインラインカード)

app/recipes/[candidateId]/_components/
└── DetailClient.tsx                            ← 更新 (DetailMakeCTA 追加 + HeaderRow)

firestore.rules                                 ← 更新 (drafts subcollection)

public/                                         ← 更新 (favicon-16x16.png / favicon-32x32.png / apple-touch-icon.png)
```

## 1. Domain 型 (`src/domain/feedback.ts`)

```ts
import type { RecipeMaterial, RecipeMeta, RecipeStory } from './recipe';

/**
 * フィードバック 1 件のスナップショット。
 * users/{uid}/savedRecipes/{candidateId}.feedback として埋め込み保存。
 * users/{uid}/drafts/{candidateId} に同 shape の partial を自動保存 (3 秒 debounce)。
 */
export type Feedback = {
  /** 0 = 未評価。1..5 で総合 ★。submit 時は 1 以上必須 */
  overallRating: 0 | 1 | 2 | 3 | 4 | 5;
  /** 観点別ドット 5 段階。0 = 未評価 */
  axes: {
    taste: 0 | 1 | 2 | 3 | 4 | 5;
    look:  0 | 1 | 2 | 3 | 4 | 5;
    story: 0 | 1 | 2 | 3 | 4 | 5;
    again: 0 | 1 | 2 | 3 | 4 | 5;
  };
  /** 多選択チップ (各群最大 6 個) */
  whatWorked: string[];   // 効いた点 (matcha)
  whatToTune: string[];   // 次は調整したい (yamabuki)
  guestVibe: string[];    // ゲストの反応 (shu)
  /** ゲスト数 (1..20、未入力時 null) */
  guestCount: number | null;
  /** 任意自由記述 (Slice 7 では UI 持たない、predefined slot) */
  note?: string;
  /** Firestore serverTimestamp → 読出時 Date に正規化 */
  cookedAt: Date;
  updatedAt: Date;
};

export type FeedbackDraft = Partial<Omit<Feedback, 'cookedAt' | 'updatedAt'>> & {
  /** draft 更新時刻 */
  updatedAt: Date;
};

/** チップ候補マスタ — UI 表示順 / i18n の元 */
export const FEEDBACK_CHIP_OPTIONS = {
  whatWorked: ['食材の組合せ', 'ストーリーがウケた', '焼き加減', '見た目', '量', 'ワインとの相性'],
  whatToTune: ['塩味', '焼成時間', '生地の厚さ', 'トッピング量', '酸味', '油分'],
  guestVibe:  ['会話が弾んだ', '驚かれた', 'おかわり続出', '写真に撮られた', '地元トークに発展'],
} as const;

export const FEEDBACK_CHIP_CAP = 6;
export const FEEDBACK_GUEST_COUNT_MIN = 1;
export const FEEDBACK_GUEST_COUNT_MAX = 20;

/** 観点ラベル */
export const FEEDBACK_AXIS_LABELS = {
  taste: '味',
  look:  '見た目',
  story: 'ストーリー',
  again: 'また作りたい',
} as const;

/** 空状態 (初期化用) */
export function emptyFeedback(): Omit<Feedback, 'cookedAt' | 'updatedAt'> {
  return {
    overallRating: 0,
    axes: { taste: 0, look: 0, story: 0, again: 0 },
    whatWorked: [],
    whatToTune: [],
    guestVibe: [],
    guestCount: null,
  };
}

export function isFeedbackComplete(f: Pick<Feedback, 'overallRating'>): boolean {
  return f.overallRating >= 1; // submit 可否判定
}
```

`SavedRecipe` 型 ([`src/domain/saved-recipe.ts`](../../src/domain/saved-recipe.ts)) は **既存の Slice 6 追加フィールドの後ろに** `feedback?: Feedback` を optional 追加。
hasFullSnapshot は変更なし。新ヘルパ `hasFeedback(saved)` を追加。

## 2. Firestore レイヤ (`src/lib/firebase/feedback.ts`)

```ts
import { deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';
import type { Feedback, FeedbackDraft } from '@/domain/feedback';

const USERS = 'users';
const SAVED = 'savedRecipes';
const DRAFTS = 'drafts';

function savedDocRef(db, uid, candidateId) { return doc(db, USERS, uid, SAVED, candidateId); }
function draftDocRef(db, uid, candidateId) { return doc(db, USERS, uid, DRAFTS, candidateId); }

/** submit: savedRecipes/{id}.feedback に merge save + drafts/{id} を削除 */
export async function saveFeedback(db, uid, candidateId, payload): Promise<void> {
  const now = serverTimestamp();
  await setDoc(savedDocRef(db, uid, candidateId), {
    feedback: {
      ...payload,
      cookedAt: payload.cookedAt ?? now, // 初回のみ
      updatedAt: now,
    },
  }, { merge: true });
  // submit 成功で draft 破棄
  await deleteDoc(draftDocRef(db, uid, candidateId)).catch(() => {/* ignore not-exists */});
}

/** auto-save: drafts/{id} に upsert (3 秒 debounce は hook 側) */
export async function saveDraft(db, uid, candidateId, partial): Promise<void> {
  await setDoc(draftDocRef(db, uid, candidateId), {
    ...partial,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function deleteDraft(db, uid, candidateId): Promise<void> {
  await deleteDoc(draftDocRef(db, uid, candidateId));
}

export function subscribeDraft(db, uid, candidateId, onChange, onError?) {
  return onSnapshot(draftDocRef(db, uid, candidateId),
    snap => onChange(snap.exists() ? normalizeDraft(snap.data()) : null),
    err => onError?.(err));
}
```

`saved-recipe.ts` の `normalizeSavedRecipe` に `feedback` フィールドのデシリアライズを追加:
- `feedback.overallRating` を `0..5` に clamp
- `feedback.axes.{taste,look,story,again}` を `0..5` に clamp
- `feedback.cookedAt` / `updatedAt` を Date に正規化
- 多選択チップ配列は `FEEDBACK_CHIP_OPTIONS` でフィルタ (不正値除外)
- `guestCount` は `1..20` の整数 or null

## 3. Firestore Security Rules

```
match /users/{uid}/savedRecipes/{candidateId} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
// Slice 7 で追加
match /users/{uid}/drafts/{candidateId} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

`firestore.rules` に上記を追加。Rules テストも追加 (本人 / 他人 / 未認証 の 3 ケース)。

## 4. Hooks

### `use-feedback.ts`

```ts
type State = 'loading' | 'unauthenticated' | 'idle';
type Result = {
  state: State;
  saved: Feedback | null;            // savedRecipes/{id}.feedback (subscribe)
  draft: FeedbackDraft | null;       // drafts/{id} (subscribe)
  initial: Omit<Feedback, 'cookedAt' | 'updatedAt'>; // saved > draft > empty で hydrate
  save: (payload) => Promise<void>;  // submit
  discardDraft: () => Promise<void>;
};
export function useFeedback(candidateId: string): Result;
```

### `use-feedback-draft.ts`

```ts
/**
 * フォーム値の変更を 3 秒 debounce で localStorage + Firestore drafts に保存。
 * - 未サインインは localStorage のみ
 * - 「自動保存 N 秒前」のラベル表示用に updatedAt も返す
 * - submit 成功時 reset → updatedAt クリア
 */
export function useFeedbackDraft(
  candidateId: string,
  values: Partial<Feedback>,
): { lastSavedAt: Date | null; reset: () => void };
```

### `use-header-dropdown.ts`

```ts
/** Avatar+▾ 用の開閉状態 + outside click / Esc / ↑↓ Enter ハンドラ */
export function useHeaderDropdown(): {
  open: boolean;
  toggle: () => void;
  close: () => void;
  triggerProps: { ref, onClick, aria-expanded, aria-haspopup };
  menuProps:    { ref, role: 'menu', onKeyDown };
};
```

### `use-saved-recipes-journal.ts`

既存の `use-saved-recipes` をフィルタしたバリアント。

```ts
/** subscribeSavedRecipes の結果を hasFeedback でフィルタ + cookedAt 降順で再ソート */
export function useSavedRecipesJournal(): {
  state: 'loading' | 'unauthenticated' | 'ready';
  items: SavedRecipe[]; // feedback あり、cookedAt desc
};
```

## 5. コンポーネントツリー

### 5.1 統一 HeaderRow

[`src/components/shell/HeaderRow.tsx`](../../src/components/shell/HeaderRow.tsx):

```tsx
type Props = {
  title: string;
  brand?: string;            // 「ふるさとピザ帳」など (optional)
  currentRoute?: string;     // ドロップダウンの active 強調用
  onBack?: () => void;       // 未指定なら router.back()
  rightSlot?: React.ReactNode; // AvatarButton or サインインリンク
  dark?: boolean;
};
```

- 高さ 48px、`T.kinari` 背景、`borderRadius 12`
- 左: BackChip (36px round)
- 中央: brand (mono 9px shu) + title (mincho 16px sumi)
- 右: rightSlot (AvatarButton 既存を Dropdown 対応に書き換え)

### 5.2 HeaderDropdown

[`src/components/shell/HeaderDropdown.tsx`](../../src/components/shell/HeaderDropdown.tsx):

`design/slice7-screens.jsx` `HeaderDropdown` (L96) を移植。`role="menu"` + item 順序:
1. ユーザ情報行 (Avatar + displayName + email)
2. 📔 ピザ帳 (保存) → /library
3. 📓 振り返り帳 (作った) → /journal
4. (divider)
5. サインアウト

- 現在ルートに朱の縦バー + 薄塗り
- outside click / Esc で閉じる
- ↑↓ で循環、Enter で確定、初期 focus は 1 行目

### 5.3 AvatarButton (改修)

既存の「クリックで /library 直行」を「クリックで Dropdown 開閉」に変更。
HeaderDropdown を内包し、`useHeaderDropdown()` を使用。

```tsx
// 構造:
<>
  <button ref={triggerRef} onClick={toggle} aria-expanded={open}>
    <Avatar/> <Chevron open={open}/>
  </button>
  {open && <HeaderDropdown ref={menuRef} currentRoute={pathname} onClose={close}/>}
</>
```

### 5.4 FurusatoMark / Wordmark

[`src/components/brand/FurusatoMark.tsx`](../../src/components/brand/FurusatoMark.tsx):
- `design/pizza-tokens.jsx` `MarkA` `MarkB` `MarkC` `MarkD` `FurusatoMark` をそのまま TSX 化
- SVG をインライン、`PIZZA_PAL` も同ファイルに移植
- `size <= 18` のとき自動で variant A にフォールバック (既存ロジック維持)

[`src/components/brand/Wordmark.tsx`](../../src/components/brand/Wordmark.tsx):
- horizontal / stacked / vertical の 3 kind
- `dark` プロパティで反転対応

### 5.5 Journal 系

`JournalCard`: hero pizza img + strategy seal + title + ★Row + axes mini bar + worked tags chips
`JournalEmpty`: 円形プレースホルダ + hint card (「まずは保存帳から」)
`StatTile`: label / value / sub の 3 要素 + accent ストライプ
`StarRow`: read-only ★ 表示 (input ではない)

### 5.6 Feedback 系

`StarInput` (1〜5 + 0 クリア + キーボード):
- `role="radiogroup"`
- 1〜5 の数字キー / ←→ / 0 でクリア
- 同じ★ 再タップで 0

`DotsInput` (0〜5 のドット):
- `role="slider"` `aria-valuemin=0 aria-valuemax=5 aria-valuenow=N`
- ←→ で増減 / Home (0) / End (5)
- 同位置 ● 再タップで 1 段戻し

`ChipGroup` (multi-select):
- 上限 6 (cap 到達で `aria-disabled` + Toast)
- 選択数バッジ (0 のときは出さない)

`GuestCountInput`: 1〜20 / `−` / `+` / 既定 `—`

`CameraPlaceholder`: アイコン + 「準備中」バッジ、クリックで info Toast

### 5.7 CrossLink

`design/slice7-screens.jsx` `CrossLink` (L247) を移植。
保存帳 ⇄ 振り返り帳 の往復ピル、`count` を実数字で表示。

### 5.8 DetailMakeCTA

`design/slice7-screens.jsx` `DetailCTA_A` (L851) を移植。

```tsx
type Props = {
  state: 'ready' | 'guest' | 'unsaved';  // 状態に応じてメッセージ + ハート + 朱 CTA disabled 切替
  onMakeClick: () => void;
  onHeartClick: () => void;
};
```

DetailClient で `/recipes/[id]` 画面の hero 直下に追加。
state 判定:
- 未サインイン → `guest`
- サインイン済 + ハート未押下 → `unsaved`
- サインイン済 + ハート押下済 → `ready` (タップで /feedback/[id] へ)

未サインインで「作ってみる」を押した場合は SignInModal を起動。

## 6. /journal ページ

[`app/journal/page.tsx`](../../app/journal/page.tsx):
```tsx
import { JournalClient } from './_components/JournalClient';
export default function Page() {
  return <JournalClient/>;
}
```

[`app/journal/_components/JournalClient.tsx`](../../app/journal/_components/JournalClient.tsx):
- `useAuth()` で auth state、未認証なら `<JournalEmpty signedIn={false}/>` を表示
- `useSavedRecipesJournal()` で hasFeedback の items を取得
- 0 件 → `<JournalEmpty/>` (saved 0 件か feedback 0 件かでメッセージ変える)
- 1 件以上 → HeaderRow + hero copy + Stat 3 タイル + CrossLink + filter chips + JournalCard 一覧

Stat の計算:
- 「作った数」 = items.length
- 「平均 ★」 = items の overallRating 平均 (小数 1 桁)
- 「効いた点」 = whatWorked タグの最多項目 (件数併記)

タップ時の遷移: `/recipes/[id]` (既存の sessionStorage 経由 hydrate と同じ。
SavedRecipe 内に detail + feedback 揃っているので stream.start は呼ばない)。

## 7. /feedback/[candidateId] ページ

[`app/feedback/[candidateId]/page.tsx`](../../app/feedback/[candidateId]/page.tsx):
- 認証必須 (未認証 → SignInModal & redirect)
- `useFeedback(candidateId)` で saved feedback + draft を取得
- 初期値 = saved > draft > empty で hydrate
- 各フォーム値変更 → `useFeedbackDraft(...)` で 3 秒 debounce auto-save
- CTA「記録して〜」押下 → `save(payload)` → toast「ピザ帳に記録しました」→ `router.push('/journal')`
- overallRating === 0 の間 CTA disabled + 「★ を 1 つ以上つけると記録できます」

エラーケース:
- candidateId に対応する saved recipe が存在しない → /library に redirect + warning toast
- Firestore write 失敗 → toast warning、draft は localStorage に残るので再 submit 可

## 8. /library 改修

[`app/library/_components/LibraryClient.tsx`](../../app/library/_components/LibraryClient.tsx):

- ProfileStrip を削除 (Header に集約)
- HeaderRow (title="保存帳", brand="ふるさとピザ帳") を追加
- hero copy: eyebrow「SAVED · 保存したアイデア」+ headline「これから作る、あなたの一枚たち。」
- 「保存中 N 件 · うち作った M 件」のメタ表示
- CrossLink「振り返り帳へ」(matcha) を hero 下に
- LibraryCard に「作った」サブバッジ (feedback がある場合のみ表示)
- 既存のフィルタチップは現状維持

## 9. /recipes/[id] 改修

[`app/recipes/[candidateId]/_components/DetailClient.tsx`](../../app/recipes/[candidateId]/_components/DetailClient.tsx):

- topRow (現状の AvatarButton 単体) を HeaderRow (title="詳細レシピ") に置換
- RecipeHero 直下に `DetailMakeCTA` を追加 (案 A インラインカード)
  - 既存のハート機能は DetailMakeCTA の右端に集約 (重複ハート UI を整理)
  - 既存の RecipeHero 内のハートは残す (画面上のハートが 2 箇所になるが、画像上にも明示する設計のため)
- 既存の動作 (stream.start / stream.hydrate) は変更なし

## 10. TOP refresh

[`app/_components/TopClient.tsx`](../../app/_components/TopClient.tsx):

- 既存の 3 つの strategy seal 装飾を削除
- 中央上部に `<FurusatoMark variant="B" size={104}/>` を配置
- ブランドキャプション「**ふるさとピザ帳** / FURUSATO PIZZA-CHŌ」(明朝 + mono 横並び)
- タグライン「未来の一枚は、あなたの地元にある。」は維持 (fontSize 32 に拡大)
- 既存 CTA 「始める →」と「サインインしてピザ帳を開く」は維持
- 既存の自動 redirect (TOP → /local / /library) は維持

## 11. layout.tsx + favicon

[`app/layout.tsx`](../../app/layout.tsx):

```ts
export const metadata: Metadata = {
  title: 'ふるさとピザ帳',
  description: '地元の食材と季節から、AI があなただけのピザを 3 案提案。',
};
```

`public/`:
- `favicon.ico` (16x16 / 32x32 multi-size from MarkA SVG → ICO)
- `apple-touch-icon.png` (180x180 from MarkB)
- `icon-192.png` / `icon-512.png` (PWA 用、Slice 7 では metadata 参照しない)

favicon 生成方法: `MarkA` の SVG を `pnpm exec sharp` か手動で PNG 化 → ICO 変換。
コードでは React/SVG を生で書いているので、build 時に generate するか手動で 1 回置く。
Slice 7 では **手動で 1 度生成して `public/` に commit** する方針。

## 12. CSS Modules vs インライン

`design/slice7-screens.jsx` は React style props でインラインスタイル多用。
プロジェクト規約は **CSS Modules** (`*.module.css`) なので、移植時に CSS に書き起こす。
ただし FurusatoMark / Wordmark の SVG は style props を維持 (SVG attribute との混在を避けるため)。

## 13. Phase 分け

実装は以下の順 (依存関係で配列):

### Phase 1: ブランド資産 (3 task)
- `FurusatoMark.tsx` / `Wordmark.tsx` 移植 + ユニットテスト (SVG snapshot)
- favicon 生成 + `public/` に配置
- `layout.tsx` metadata 更新

### Phase 2: 統一 Header (3 task)
- `HeaderRow.tsx` 新規 (BackChip + title + slot)
- `HeaderDropdown.tsx` 新規 + `use-header-dropdown.ts`
- `AvatarButton.tsx` 改修 (Dropdown トリガに変身)

### Phase 3: Feedback 基盤 (4 task)
- `src/domain/feedback.ts` + 型 / 定数 / helpers
- `src/lib/firebase/feedback.ts` + tests
- `firestore.rules` に drafts subcollection 追加 + rules test
- `use-feedback.ts` + `use-feedback-draft.ts`

### Phase 4: Feedback UI (4 task)
- `StarInput` / `DotsInput` / `ChipGroup` / `GuestCountInput` / `CameraPlaceholder`
- `/feedback/[id]` page + FeedbackClient
- DetailClient に `DetailMakeCTA` 追加 + HeaderRow 置換
- E2E (smoke): feedback flow

### Phase 5: Journal (3 task)
- `JournalCard` / `JournalEmpty` / `StatTile` / `StarRow`
- `use-saved-recipes-journal.ts`
- `/journal` page + JournalClient

### Phase 6: Library + TOP refresh (3 task)
- `LibraryClient` 改修 (HeaderRow + CrossLink + cooked badge)
- `TopClient` 改修 (FurusatoMark + ブランドキャプション)
- 全画面の AvatarButton 配置を HeaderRow に切替 (/local, /ingredients, /candidates)

### Phase 7: 動作確認 + ラップアップ (3 task)
- フル CI green 確認 (typecheck / lint / test / rules / e2e)
- README + docs/architecture 更新 (Slice 7 反映)
- v0.7.0 タグ push + Cloud Run 自動デプロイ確認

各 Phase 末で push + main へ自動デプロイ。

## 14. テスト戦略

| 種別 | 対象 |
|---|---|
| Vitest | `feedback.ts` (clamp / normalize) / `useFeedback` / `useFeedbackDraft` (fake timers で debounce) / `StarInput` / `DotsInput` / `ChipGroup` / `HeaderDropdown` (kbd nav) |
| Rules | `users/{uid}/drafts/{x}` の self R/W + 他人拒否 + 未認証拒否 (3 ケース) |
| E2E | (smoke) サインイン済で /recipes/[id] → 作ってみる → /feedback → 記録 → /journal で表示 |

既存 449 tests + Slice 7 追加 50+ tests = 500 tests 目標。

## 15. 後方互換性

- `feedback?` は optional なので旧 SavedRecipe doc に影響なし
- `drafts/` subcollection は新規追加のみで既存パス未影響
- /library と /journal は別ルートのため既存 /library URL は変更なし
- AvatarButton のクリック挙動が「/library 直行」→「Dropdown 開」に変わる → 既存ユーザ操作の挙動変化。
  Toast やオンボーディング無しで切替 (シンプル) — 行き先 (ピザ帳) は Dropdown 1 タップ目で到達できるため UX 劣化なしと判断

## 16. リスクと緩和

| リスク | 緩和 |
|---|---|
| 3 秒 debounce auto-save が連投で Firestore quota 圧迫 | useFeedbackDraft 側で最終値だけ送る (前回値と差分なしならスキップ) |
| HeaderDropdown が Safari iOS で outside click 拾わない | document に pointerdown + close-on-blur の二段構え |
| feedback subcollection 不在で normalizeSavedRecipe が undefined アクセス | optional 全域、`?.` で防御 (clampScore がデフォルト 0) |
| favicon ICO 生成の手間 | `public/icon.svg` を主軸にして browser に任せる選択肢も。Phase 1 で決める |
| StarInput の同じ★再タップ 0 クリアが学習コスト高 | ヒントテキスト「タップで点灯、再タップで解除」を初回のみ表示 |
| Slice 8 で予定の写真添付 / Vertex Eval と shape 衝突 | Feedback 型に `note?` + 将来 `photoUrls?` を pre-reserved。Vertex Eval は別 collection で持つ予定 |

## 17. デプロイ影響

- 新規 routes (`/journal`, `/feedback/[id]`) の SSR は dynamic = 'force-dynamic' 不要 (client-only)
- Cloud Run 環境変数の追加なし
- Firestore Rules 再 deploy 必要 (drafts subcollection ルール追加)
- favicon は静的 asset なので Web Dockerfile rebuild で反映

## 18. 改訂履歴

| 日付 | 版 | 変更 |
|---|---|---|
| 2026-05-24 | 1.0 | 初版作成 (Claude Design 受領後の確定設計、TOP refresh + BrandMark を含む) |
