# Refactoring Foundation — design

> requirements.md の AC を満たすための実装設計。各フェーズで「抽出する共通基盤の
> インターフェース」「移行対象」「振る舞いを変えないことの担保方法」を定義する。
> Phase 1 を最も詳細に、Phase 2〜5 は着手時に各 tasklist で詳細化する前提の方針設計。

---

## 0. 全体方針

- **抽出基準**: 「3 箇所以上で重複が確認できたパターン」のみ共通化する (requirements §7)。
- **振る舞い不変の担保**: 各共通基盤の抽出は「既存 hook/関数の内部実装の差し替え」であり、
  **公開シグネチャ (返り値の型・関数名・引数) を変えない**。既存のコロケーションテストが
  そのまま通ることを回帰の安全網とする。テストが無い振る舞い (ストリーム unmount abort) は
  **先に characterization テストを追加** してから抽出する。
- **コミット粒度**: 1 共通基盤 = 1 コミット。基盤追加 → 移行 → テスト確認を 1 単位とする。

---

## 1. Phase 1 — フロントエンド共通基盤 【効果: 高 / 工数: L】

### 1a. ストリーミング基盤 `useStreamController`

#### 現状の重複 (根拠)

`use-quicktap-stream.ts` (292 行) と `use-recipe-detail-stream.ts` (254 行) で以下が同一:

| 要素 | 重複内容 |
| --- | --- |
| `consumeStream(res, dispatch, abortRef)` | `!res.ok` チェック → `decodeNdjsonStream` ループ → `done`/`error` dispatch。schema 以外は完全一致 |
| `start` 冒頭 | `abortRef.current?.abort()` → `new AbortController()` → `abortRef.current = ac` |
| 429 処理 | `if (res.status === 429) { toast.push(...); dispatch({type:'error', error:'RATE_LIMITED'}); return; }` |
| `catch` | `if (ac.signal.aborted) return; dispatch({type:'error', ...})` |
| `reset` / `hydrate` | `abortRef.current?.abort()` 前置 |

両 hook の `Action` union は既に **`{type:'event';event}` / `{type:'done'}` / `{type:'error';error}`** を
共通で持つ。reducer と state 形状のみがドメイン固有。

#### 設計判断: reducer は各 hook に残し、「コントローラ」を抽出する

state 形状と reducer はドメイン固有 (候補配列 vs 単一レシピ) なので統合しない。
**副作用 (AbortController ライフサイクル・fetch・NDJSON 消費・429・unmount cleanup) のみ**を
`useStreamController` に抽出する。

```ts
// src/hooks/use-stream-controller.ts
'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { ZodType } from 'zod';
import { decodeNdjsonStream } from '@/lib/agent/stream';
import { buildRateLimitToastMessage } from '@/lib/rate-limit/toast';
import { useToast } from './use-toast';

/** 各ストリーム hook の Action union が必ず含む制御アクション */
export type StreamControlAction<E> =
  | { type: 'event'; event: E }
  | { type: 'done' }
  | { type: 'error'; error: string };

export type RunOptions = {
  /** 429 Toast 用のルート表示名 (buildRateLimitToastMessage に渡す) */
  rateLimitRoute: string;
};

export type UseStreamControllerResult<E> = {
  /**
   * 既存ストリームを abort → fetchFn 実行 → 429 判定 → NDJSON 消費まで一括処理。
   * fetchFn は signal を受け取り Response を返す (apiFetch をラップして渡す)。
   */
  run: (
    fetchFn: (signal: AbortSignal) => Promise<Response>,
    opts: RunOptions,
  ) => Promise<void>;
  /** 進行中ストリームを中断 (reset/hydrate の前段で呼ぶ) */
  abort: () => void;
};

export function useStreamController<E>(
  schema: ZodType<E>,
  dispatch: React.Dispatch<StreamControlAction<E>>,
): UseStreamControllerResult<E> {
  const abortRef = useRef<AbortController | null>(null);
  const toast = useToast();

  // ★ バグ修正: アンマウント時に進行中ストリームを中断する (現状は未実装)
  useEffect(() => () => abortRef.current?.abort(), []);

  const consume = useCallback(
    async (res: Response): Promise<void> => {
      if (!res.ok || !res.body) {
        dispatch({ type: 'error', error: `HTTP ${res.status}` });
        return;
      }
      try {
        for await (const event of decodeNdjsonStream(res.body, schema)) {
          if (abortRef.current?.signal.aborted) return;
          dispatch({ type: 'event', event });
        }
        dispatch({ type: 'done' });
      } catch (err) {
        dispatch({ type: 'error', error: err instanceof Error ? err.message : String(err) });
      }
    },
    [schema, dispatch],
  );

  const run = useCallback<UseStreamControllerResult<E>['run']>(
    async (fetchFn, opts) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const res = await fetchFn(ac.signal);
        if (res.status === 429) {
          toast.push({
            kind: 'warning',
            message: buildRateLimitToastMessage(res, opts.rateLimitRoute),
          });
          dispatch({ type: 'error', error: 'RATE_LIMITED' });
          return;
        }
        await consume(res);
      } catch (err) {
        if (ac.signal.aborted) return;
        dispatch({ type: 'error', error: err instanceof Error ? err.message : String(err) });
      }
    },
    [toast, consume, dispatch],
  );

  const abort = useCallback(() => abortRef.current?.abort(), []);

  return { run, abort };
}
```

#### 移行後の利用側 (例: use-quicktap-stream)

```ts
const [state, dispatch] = useReducer(reducer, initialState);
const { run, abort } = useStreamController(CandidateStreamEventSchema, dispatch);

const start = useCallback(async (input) => {
  dispatch({ type: 'start', sessionId: generateSessionId() });
  trackEvent('generate_candidates', { mode: 'initial', ... });
  await run(
    (signal) => apiFetch('/api/quicktap/sessions', {
      method: 'POST', body: JSON.stringify({ ...input, sessionId }), signal,
    }),
    { rateLimitRoute: '/api/quicktap/sessions' },
  );
}, [run]);

const reset = useCallback(() => { abort(); dispatch({ type: 'reset' }); }, [abort]);
const hydrate = useCallback((sessionId, candidates) => {
  abort(); dispatch({ type: 'hydrate', sessionId, candidates });
}, [abort]);
```

`use-recipe-detail-stream` も同様 (schema を `RecipeDetailStreamEventSchema`、`reroll` 無し)。

> **注意点**: 現状 quicktap の `start` は「sessionId 生成 → dispatch('start') → trackEvent →
> fetch」の順。`generateSessionId` の sessionId は body にも入れる必要があるため、
> `run` に渡す `fetchFn` のクロージャ内で参照する。dispatch('start') と trackEvent は
> `run` の **前** に呼ぶ (現状の順序を保つ)。

#### 振る舞い不変の担保

- 既存テスト `use-quicktap-stream.test.tsx` / `use-recipe-detail-stream.test.tsx` がそのまま通ること。
- **新規 characterization テスト** を先に追加: 「ストリーム進行中に unmount すると
  `decodeNdjsonStream` の AbortSignal が aborted になる」。現状はこれが落ちる (バグの証明) →
  `useStreamController` 導入後にグリーンになる。これで AC-R1 を満たす。

### 1b. Firestore 購読基盤 `useFirestoreSubscription`

#### 現状の重複 (根拠)

`use-saved-recipes` / `use-saved-recipe` / `use-feedback` (recipe 部分) で以下が同一:

- `useAuth()` の `status` で `loading` / `unauthenticated` を早期 return し state/data を null に
- 認証済なら `getFirebaseDb()` → `subscribeXxx(db, uid, onData, onError)` → cleanup で unsub
- `error` を `useState<Error|null>` で保持、effect 冒頭で `setError(null)`
- `/* eslint-disable react-hooks/set-state-in-effect */` の定型

#### 設計

単一ドキュメント/コレクション購読の **認証ゲート + ライフサイクル + error** を抽出。
state の最終的な意味付け (`'ready'` vs `'saved'/'unsaved'`) は呼び出し側で `status` と `data` から導出。

```ts
// src/hooks/use-firestore-subscription.ts
export type FirestoreSubscriptionStatus = 'loading' | 'unauthenticated' | 'ready';

export type SubscribeFn<T> = (
  db: Firestore,
  uid: string,
  onData: (data: T) => void,
  onError: (err: Error) => void,
) => () => void;

export function useFirestoreSubscription<T>(
  subscribe: SubscribeFn<T>,
): { status: FirestoreSubscriptionStatus; data: T | null; error: Error | null };
```

> `subscribe` は **参照安定** が必要 (effect deps に入るため)。呼び出し側で `useCallback`
> もしくはモジュールトップレベル関数を渡す。candidateId のように引数を閉じ込める場合は
> `useCallback([candidateId])` でラップする (use-saved-recipe)。

#### 移行例

```ts
// use-saved-recipes.ts
const sub = useCallback<SubscribeFn<SavedRecipe[]>>(
  (db, uid, onData, onError) => subscribeSavedRecipes(db, uid, onData, onError), []);
const { status, data, error } = useFirestoreSubscription(sub);
return { state: status, items: data, error }; // status='ready' がそのまま 'ready'

// use-saved-recipe.ts
const sub = useCallback<SubscribeFn<SavedRecipe | null>>(
  (db, uid, onData, onError) => subscribeSavedRecipe(db, uid, candidateId, onData, onError),
  [candidateId]);
const { status, data, error } = useFirestoreSubscription(sub);
const state = status === 'ready' ? (data ? 'saved' : 'unsaved') : status;
// save/unsave は現状のまま useSavedRecipe 内に残す
```

> **use-furusato-items** は「複数 ingredientId を並列購読」する別パターン (3 箇所目の単一購読
> ではない) のため、本フェーズの単一購読基盤の対象外。現状実装のまま据え置き、必要なら
> 別途 `useFirestoreSubscriptions` (複数版) を将来検討 (OUT)。

### 1c. localStorage 購読基盤 `createStorageStore` / `useStorageValue`

#### 現状の重複 (根拠)

`use-locale.ts` と `use-oven-profile.ts` で **subscribe / getSnapshot(キャッシュ付き) /
getServerSnapshot / notify / listeners Set / isHydrated effect** が丸ごと同一。
getSnapshot の「raw 文字列が同じなら同じ参照を返す」キャッシュは間違えやすい繊細な実装。

#### 設計

ドメイン固有の read/write/clear/key を受け取り、`useSyncExternalStore` 機構を内包した
ストアファクトリを提供する。read/write/parse は既存の `lib/localstorage/locale.ts` 等を流用。

```ts
// src/lib/localstorage/create-storage-store.ts
export type StorageStore<T> = {
  /** React hook: 値を購読 (SSR は null) */
  useValue: () => T | null;
  /** 値を書き込み、購読者に通知 */
  set: (write: () => void) => void; // write は呼び出し側が writeXxx() を渡す
  /** mount 後 true になる hydration フラグ hook */
  useHydrated: () => boolean;
};

export function createStorageStore<T>(opts: {
  key: string;
  read: () => T | null; // 既存 readLocale 等
}): StorageStore<T>;
```

> モジュールスコープの `listeners` / キャッシュをファクトリ内に閉じ込めることで、
> locale 用・oven-profile 用それぞれ独立したストアインスタンスになる。
> 公開 hook (`useLocale` / `useOvenProfile`) のシグネチャは不変。

> **2 箇所のみの重複だが対象に含める理由**: 機構が ~50 行と大きく、getSnapshot キャッシュ
> ロジックが繊細でコピペ時にバグを生みやすいため (requirements §7 の例外的判断)。
> `use-feedback-draft` も近い構造を持つため、移行時に 3 箇所目として精査する。

---

## 2. Phase 2 — API 層の定型コード統一 【効果: 中 / 工数: M】

### 2a. `parseJsonBody` / `getPathParam`

```ts
// src/lib/http/parse-body.ts
export async function parseJsonBody<T>(request: Request, schema: ZodType<T>): Promise<T>;
// JSON parse 失敗 → apiError.badRequest('BAD_BODY', ...)
// zod 失敗 → apiError.badRequest('BAD_BODY', issues.map(i=>i.message).join('; ')) で統一

// src/lib/http/path-param.ts
export function getPathParam(request: Request, index: number): string | null;
```

- 移行対象: `app/api/quicktap/sessions/route.ts`, `app/api/recipes/[candidateId]/route.ts`,
  `app/api/share/route.ts`, `app/api/quicktap/sessions/[id]/reroll/route.ts`,
  `app/api/locales/[id]/ingredients/route.ts`。
- zod エラー整形を `.issues.map(i=>i.message).join('; ')` に統一 (share の `.error.message`
  単独を揃える)。**ただしレスポンスの error code/形式は現状と同一に保つ** (互換性)。

### 2b. `Candidate` スキーマの domain 集約

- `app/api/recipes/[candidateId]/route.ts` 内の `CandidateSchema` を `src/domain/candidate.ts`
  に移し、`export type Candidate = z.infer<typeof CandidateSchema>` に統一。
- 既存の `Candidate` 型利用箇所が壊れないことを typecheck で確認。

### 2c. `lib/firebase/normalize.ts`

- `feedback.ts` / `saved-recipe.ts` の Timestamp→Date 変換・score clamp を共通化。
- 既存テスト (`schemas.test.ts` 等) で正規化結果が不変であることを確認。

> **レートリミット fail-open は触らない** (requirements OUT)。

---

## 3. Phase 3 — TS ⇔ Python スキーマ同期保証 【効果: 高 / 工数: M】

### 設計: 契約テスト (Python が JSON を生成 → TS が zod で検証)

1. **Python 側 fixture 生成**: `agent/tests/` または `agent/scripts/` に、`stream.py` の全
   `StreamEvent` サブタイプの代表インスタンスを `model_dump_json()` で書き出すスクリプト/テスト。
   出力先は `src/domain/__fixtures__/stream-events.generated.json` (リポジトリにコミット)。
2. **TS 側契約テスト**: `src/domain/schemas.contract.test.ts` で上記 JSON を読み、
   各行を `CandidateStreamEventSchema` / `RecipeDetailStreamEventSchema` でパース成功を検証。
3. **網羅性チェック**: fixture に含まれる `type` 値の集合が、zod union の全 `type` リテラルと
   一致することを assert (どちらかにイベント追加して fixture 未更新なら落ちる)。
4. CI で「fixture 再生成して差分が出ないこと」をチェック (Python 側 generate → git diff)。

> 偽陰性対策 (requirements §7): union の要素数と fixture の type 種類数の一致を必須化。
> Pydantic → zod の完全自動 codegen は OUT。本フェーズは「ずれの検出」までを担保する。

---

## 4. Phase 4 — Python エージェント整理 【効果: 中 / 工数: M】

### 4a. `SingletonManager[T]` (deps.py)

```python
class SingletonManager(Generic[T]):
    def __init__(self, factory: Callable[[Settings], T]) -> None: ...
    def get(self, settings: Settings | None = None) -> T: ...
    def reset(self) -> None: ...          # reset_*_for_testing 相当
    def set(self, instance: T) -> None: ...  # set_*_for_testing 相当
```

- LLM / Imagen / Storage / Furusato / Rakuten の 5 つを `SingletonManager` インスタンス化。
- 既存の `get_* / reset_*_for_testing / set_*_for_testing` 公開関数は **薄いラッパとして維持**
  (呼び出し側とテストを壊さない)。`test_deps.py` がそのまま通ること。

### 4b. 並列イベントストリーミング基盤

- `orchestrator.py` / `recipe_orchestrator.py` の Queue + TaskGroup + sentinel ドレーンを
  共通ヘルパ (`agents/_parallel_stream.py` 等) に抽出。各 orchestrator は「どのタスクを流すか」
  だけを記述。`test_orchestrator.py` / `test_recipe_orchestrator.py` がそのまま通ること。

### 4c. routes 共通化 + HTTPException 形式統一

- `routes/candidates.py` / `recipes.py` の locale+食材解決を共通関数に。
- HTTPException の detail 形式を統一 (FastAPI が `detail` で wrap する点を含め、TS 側が
  期待する `{error:{code,message}}` 形式と実レスポンスのずれを **先に確認** してから統一)。

### 4d. refresh_furusato_cache.py のサービス抽出

- CLI/IO とコアロジックを分離し `RefreshFurusatoCacheService` に。`test_furusato_cache.py` を維持。

---

## 5. Phase 5 — UI 分割 + 衛生 【効果: 中 / 工数: M】

### 5a. 即時対応 (フェーズ前倒し)

- **js-yaml を dependencies へ移動** (`@types/js-yaml` も devDeps のままで可だが要確認)。
  `prebuild` (`scripts/build-ingredient-data.ts`) が production install でも動くことを確認。
- **docs/ への Slice 8〜10 反映**: `architecture.md` の API 一覧に `/api/share` 追記、
  rate-limit / share の章を `functional-design.md` に追加、`glossary.md` に用語追加 (AC-R11)。
- **_reference/ の削除判断**: `.steering/` 内の参照を grep し、解決済みなら削除を提案
  (削除は破壊的操作のためユーザ確認の上で実施)。

### 5b. コンポーネント分割

- `DetailClient.tsx`: `handleHeart` / `handleMakeClick` で複製されている snapshot 構築を
  `buildSavePayload(pending, candidate, stream, localeId)` に抽出 (複製解消)。
- `FeedbackClient.tsx`: 写真アップロードを `useFeedbackPhotoUpload` に、PhotoZone を子
  コンポーネントに分離。
- `equipment/page.tsx`: `BenefitCard` 等を `src/components/equipment/` に、データを
  `src/data/equipment-guide.ts` に外出し。

### 5c. マイクロ重複の集約

- `src/lib/format-date.ts` に日付フォーマットを統一 (3 ファイルの個別実装を置換)。
- skeleton 表現を共通コンポーネント化、CSS の `skeletonPulse` keyframes を共通 module に集約。

---

## 6. テスト戦略

- **Phase 1**: 既存 hook テスト + 新規 unmount-abort characterization テスト。
- **Phase 2**: 既存 route/domain テスト。必要なら `parseJsonBody` の単体テストを追加。
- **Phase 3**: 新規契約テスト (本フェーズの成果物そのもの)。
- **Phase 4**: 既存 pytest 一式 (deps/orchestrator/routes/furusato)。
- **Phase 5**: 既存 UI テスト + DetailClient の `buildSavePayload` 単体テスト。
- 各フェーズ完了の定義: `pnpm lint && pnpm typecheck && pnpm test` + 該当する
  `pnpm test:rules` / agent `pytest` がグリーン。

---

## 7. ロールアウト順 (推奨)

1. **即時**: js-yaml 移動 (Phase 5a の一部・独立・低リスク)
2. **Phase 1**: ストリーム → Firestore 購読 → localStorage の順 (高レバレッジ・バグ修正含む)
3. **Phase 3**: 契約テスト (スキーマ同期の恒久ガード)
4. **Phase 2**: API 定型コード統一
5. **Phase 4**: Python エージェント整理
6. **Phase 5**: UI 分割 + 残りの衛生対応 + docs 反映

各フェーズは独立コミット。フェーズ間で依存は無いため、途中で中断・再開可能。
