# Slice 4 設計書 — Firestore + Auth + GCS 画像永続化

> 本書は [`requirements.md`](requirements.md) を実装するための設計を記述する。
> 視覚デザインは [`design-request-prompt.md`](design-request-prompt.md) + Claude Design
> 成果物 ([`design/slice4-screens.jsx`](../../design/slice4-screens.jsx) /
> [`design/MakeLocalPizzaRecipe.html`](../../design/MakeLocalPizzaRecipe.html)) を正本とする。
> Slice 1〜3 で固めた NDJSON / ADK / Vertex 基盤と CSS Modules + 和紙トークンは流用。

---

## 1. 設計の全体方針

### 1.1 6 つの設計判断

1. **Firebase Web SDK は client-only で初期化** — `src/lib/firebase/client.ts` に singleton。
   Server Components / Route Handlers (BFF) では使わない (Auth トークンは Web → BFF →
   Python Agent への ID 検証フローを Slice 5+ で予定、Slice 4 は **client → Firestore 直接**)。

2. **Firestore は client SDK が直接書く** — `users/{uid}/savedRecipes/{candidateId}` に
   `setDoc / deleteDoc / onSnapshot`。Security Rules で `request.auth.uid == uid` を強制。
   Slice 4 は BFF route を経由しない (シンプル + Auth トークン管理不要)。

3. **Auth 状態は React Context** で全画面に提供 — `useAuth()` フックで
   `{ status, user, signIn, signOut }` を取れる。SSR 中は `status: 'loading'`、
   hydration 後に Firebase から実状態を引く。

4. **Modal でサインインを完結** — popup そのものは Firebase 標準に任せるが、
   起動トリガーをアプリ内 `<dialog>` Modal にまとめることで「保存しようとしたら
   Modal が出てくる」体験を統一する。Modal は `useSignInModal()` フックで開閉。

5. **GCS は image_agent から直 put** — Slice 4 の Firebase Storage Emulator
   (`localhost:9199`) に Python から `google-cloud-storage` で put。Emulator URL を
   そのまま `image.ready { url }` に乗せる。本番デプロイ時 (Slice 6) に署名付き URL に切替。

6. **Toast はグローバルな `<ToastHost>` + Context** — Slice 1〜3 の alert を撲滅し、
   詳細画面の保存 / 解除、サインアウト完了、エラー (Imagen 失敗等) を統一的に通知。

### 1.2 Slice 4 が決めること / 決めないこと

| カテゴリ | 決めること | 決めないこと (将来) |
| --- | --- | --- |
| Auth プロバイダ | Google Sign-In のみ | Email/Anonymous/Apple |
| Auth トークン伝搬 | client → Firestore 直接 | client → BFF → Agent の ID 検証 (Slice 5+) |
| Firestore 範囲 | `users/{uid}/savedRecipes` の R/W | `users/{uid}/sessions/...` の履歴永続化 (Slice 5+) |
| 画像永続化 | Slice 4 用 Storage Emulator put + URL | 本番 GCS bucket / lifecycle / WebP 変換 (Slice 6) |
| Modal | `<dialog>` ベース (HTMLDialogElement) | カスタム Portal ベースへの移行 (現状不要) |
| Profile | name + email + photoURL + サインアウト | 名前変更・履歴・通知設定 |

---

## 2. アーキテクチャ

### 2.1 全体図 (Slice 4 終了時点)

```
┌────────────────────────────────────────┐
│ Browser (Next.js client)               │
│                                        │
│  ┌──────────┐   useAuth/useSignInModal │
│  │ /        │ ──┐                      │
│  │ /local   │   │                      │
│  │ ...      │   │   React Context      │
│  │ /recipes │   ├─→ (Auth + Toast)     │
│  │ /library │ ──┘                      │
│  └──────────┘                          │
│       │                                │
│       │ Firebase Web SDK               │
│       ├─→ Auth Emulator   :9099        │
│       ├─→ Firestore       :8080        │
│       └─→ Storage         :9199        │
└────────────────────────────────────────┘
       │ (NDJSON)
       ▼
┌────────────────────────────────────────┐
│ Next.js BFF (Route Handlers)           │
│  /api/quicktap/sessions                │
│  /api/quicktap/sessions/[id]/reroll    │
│  /api/recipes/[candidateId]            │
└────────────────────────────────────────┘
       │ (HTTP NDJSON)
       ▼
┌────────────────────────────────────────┐
│ Python Agent (uvicorn :8001)           │
│  /agent/generate-candidates            │
│  /agent/reroll                         │
│  /agent/recipes/[id]                   │
│    └─ image_agent → GCS put (Storage   │
│         Emulator) → URL on image.ready │
└────────────────────────────────────────┘
```

### 2.2 ポート構成 (Slice 4 で変更)

| Port | 用途 (Slice 3) | 用途 (Slice 4) |
| --- | --- | --- |
| 3000 | Next.js Web/BFF | 同上 |
| **8080** | **Python Agent** (uvicorn) | **Firestore Emulator** |
| **8001** | (未使用) | **Python Agent** (uvicorn) |
| 9099 | (未使用) | Auth Emulator |
| 9199 | (未使用) | Storage Emulator |
| 4000 | (未使用) | Firebase Emulator UI |

---

## 3. データモデル

### 3.1 Firestore コレクション

```
users/
  {uid}/                                  ← Firebase Auth uid
    savedRecipes/
      {candidateId}/                       ← Slice 2 で発番した candidateId
        candidateId:   string
        title:         string
        localeId:      string              ← 'miyagi' etc.
        prefecture:    string              ← '宮城県' (display)
        strategy:      'exploit'|'tune'|'explore'
        imageUrl:      string              ← GCS Storage URL
        savedAt:       Timestamp           ← serverTimestamp()
```

**設計判断:**
- ドキュメント ID = candidateId — 1 候補は 1 ユーザーにつき 1 件しか保存できない
  (重複保存防止 + ハートトグルが冪等)
- 詳細レシピ (materials/steps/story) は **保存しない** — 開く度に Agent が再生成
  (`generateRecipeDetail`)。これは Slice 3 のジャーニーをそのまま再利用するため
  (Slice 5+ で「保存時にスナップショット」を検討)
- `imageUrl` のみは GCS 上に永続化された URL を持つ (再生成のコスト削減)

### 3.2 GCS バケット

```
gs://${PROJECT}-pizza-images/   (Slice 4 では Emulator 内 localhost:9199)
  recipes/{candidateId}.png      ← image_agent が put
```

- `candidateId` がキー = 同じ候補なら 1 ファイル (上書き OK)
- public-read (Emulator は無認証、本番は Slice 6 で署名付き URL 化)

### 3.3 Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/savedRecipes/{candidateId} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Storage Rules (Slice 6 で本気):

```javascript
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /recipes/{candidateId}.png {
      allow read: if true;                                  // public read
      allow write: if false;                                 // server (Python) のみ
    }
  }
}
```

---

## 4. Auth レイヤ

### 4.1 Firebase Client SDK 初期化

```ts
// src/lib/firebase/client.ts
import { initializeApp, getApps } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

export const app = getApps()[0] ?? initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

if (useEmulator && typeof window !== 'undefined') {
  // 重複 connect を避ける (HMR 対策)
  if (!('_emulatorConnected' in auth)) {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
    (auth as unknown as Record<string, true>)._emulatorConnected = true;
  }
}
```

### 4.2 AuthContext + useAuth

```ts
// src/hooks/use-auth.tsx
type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';
type AuthUser = { uid: string; displayName: string | null;
                  email: string | null; photoURL: string | null };

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser) { setStatus('unauthenticated'); setUser(null); return; }
      setUser({
        uid: fbUser.uid,
        displayName: fbUser.displayName,
        email: fbUser.email,
        photoURL: fbUser.photoURL,
      });
      setStatus('authenticated');
    });
    return unsub;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
  }, []);

  const signOut_ = useCallback(async () => {
    await fbSignOut(auth);
  }, []);

  return <Ctx.Provider value={{ status, user, signInWithGoogle, signOut: signOut_ }}>
    {children}
  </Ctx.Provider>;
};

export const useAuth = () => useContext(Ctx)!;
```

**AuthProvider の挿入位置:** `app/layout.tsx` の `<body>` 直下 (全画面で `useAuth()` が使える)。

### 4.3 SignInModal

```tsx
// src/components/auth/SignInModal.tsx
'use client';
export function SignInModal() {
  const { open, close } = useSignInModal();
  const { signInWithGoogle } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    open ? dialogRef.current?.showModal() : dialogRef.current?.close();
  }, [open]);

  const onGoogle = async () => {
    try { await signInWithGoogle(); close(); /* 自動的に保存処理は呼ばない、呼び出し側で再 try */ }
    catch (e) { /* Toast warning */ }
  };

  return (
    <dialog ref={dialogRef} className={styles.dialog} onClose={close}>
      <div className={styles.handle} />
      <p className={styles.eyebrow}>SIGN IN</p>
      <h2 className={styles.title}>一枚を、ピザ帳に。</h2>
      <p className={styles.body}>Google で続けると保存できます。<br/>閲覧はそのまま続けられます。</p>
      <GoogleButton onClick={onGoogle} />
      <button className={styles.dismiss} onClick={close}>やめる</button>
      <p className={styles.note}>Firestore にレシピを保存します。</p>
    </dialog>
  );
}
```

`<dialog>` 要素を使うことで:
- backdrop は CSS `::backdrop` で自動 (blur(4px) 適用)
- ESC キーで close が組み込み
- focus trap が組み込み
- aria-modal が自動

### 4.4 useSignInModal フック

```ts
// src/hooks/use-sign-in-modal.tsx
const Ctx = createContext<{ open: boolean; openModal: () => void; close: () => void }>(...);
export const SignInModalProvider = ({ children }) => {
  const [open, setOpen] = useState(false);
  return <Ctx.Provider value={{ open, openModal: () => setOpen(true), close: () => setOpen(false) }}>
    {children}
    <SignInModal />  {/* 1 アプリに 1 つ */}
  </Ctx.Provider>;
};
export const useSignInModal = () => useContext(Ctx)!;
```

**配置:** `<AuthProvider>` の内側、`<ToastProvider>` の外側または同列。

---

## 5. Toast レイヤ

### 5.1 ToastContext + useToast

```ts
// src/hooks/use-toast.tsx
type ToastKind = 'success' | 'info' | 'warning';
type ToastItem = { id: string; kind: ToastKind; message: ReactNode; auto?: boolean };

type ToastContextValue = {
  push: (input: { kind: ToastKind; message: ReactNode; auto?: boolean }) => void;
};

export const ToastProvider = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((input) => {
    const id = crypto.randomUUID();
    setItems((xs) => [...xs, { id, auto: true, ...input }]);
    if (input.auto !== false) {
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 2500);
    }
  }, []);
  return <Ctx.Provider value={{ push }}>
    {children}
    <ToastHost items={items} onDismiss={(id) => setItems((xs) => xs.filter((x) => x.id !== id))} />
  </Ctx.Provider>;
};

export const useToast = () => useContext(Ctx)!.push;
```

### 5.2 ToastHost (見た目)

```tsx
// src/components/notify/ToastHost.tsx
export function ToastHost({ items, onDismiss }) {
  return (
    <div className={styles.host} role="region" aria-label="通知">
      {items.map((t) => <Toast key={t.id} {...t} onDismiss={() => onDismiss(t.id)} />)}
    </div>
  );
}
```

- 画面下中央 fixed (`position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%)`)
- 縦に積み上げ (`flex-direction: column; gap: 8px`)
- 各 Toast は max-width 360px

### 5.3 Toast 単品

```tsx
// src/components/notify/Toast.tsx
export function Toast({ kind, message, onDismiss, auto }) {
  const tone = { success: 'shu', info: 'ai', warning: 'yamabuki' }[kind];
  const icon = { success: '✓', info: 'ⓘ', warning: '⚠' }[kind];
  return (
    <div className={`${styles.toast} ${styles[tone]}`}>
      <span className={styles.bar} aria-hidden />
      <span className={styles.icon}>{icon}</span>
      <div className={styles.message}>{message}</div>
      <button className={styles.close} onClick={onDismiss} aria-label="閉じる">✕</button>
    </div>
  );
}
```

CSS (washi-deep 背景 + 朱の縦 3px ライン) はデザインに完全準拠。

---

## 6. 保存/解除フロー (詳細画面のハート)

### 6.1 useSavedRecipe フック

```ts
// src/hooks/use-saved-recipe.ts
type SavedState = 'loading' | 'unsaved' | 'saved' | 'unauthenticated';

export function useSavedRecipe(candidateId: string) {
  const { status, user } = useAuth();
  const [state, setState] = useState<SavedState>('loading');

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') { setState('unauthenticated'); return; }
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'savedRecipes', candidateId);
    const unsub = onSnapshot(ref, (snap) => {
      setState(snap.exists() ? 'saved' : 'unsaved');
    });
    return unsub;
  }, [status, user?.uid, candidateId]);

  const save = useCallback(async (snapshot: SavedRecipeSnapshot) => {
    if (!user) throw new Error('not authenticated');
    const ref = doc(db, 'users', user.uid, 'savedRecipes', candidateId);
    await setDoc(ref, { ...snapshot, savedAt: serverTimestamp() });
  }, [user?.uid, candidateId]);

  const unsave = useCallback(async () => {
    if (!user) throw new Error('not authenticated');
    const ref = doc(db, 'users', user.uid, 'savedRecipes', candidateId);
    await deleteDoc(ref);
  }, [user?.uid, candidateId]);

  return { state, save, unsave };
}
```

### 6.2 DetailClient のハートハンドラ

```ts
const heart = useSavedRecipe(candidateId);
const { openModal } = useSignInModal();
const toast = useToast();

const onHeart = async () => {
  if (heart.state === 'unauthenticated') { openModal(); return; }
  if (heart.state === 'saved') {
    await heart.unsave();
    toast({ kind: 'success', message: '保存を解除しました' });
  } else if (heart.state === 'unsaved') {
    await heart.save({ candidateId, title, localeId, prefecture, strategy, imageUrl });
    toast({ kind: 'success', message: 'ピザ帳に保存しました' });
  }
};
```

**サインイン後の自動保存はしない** — ユーザがサインインしたら Modal は閉じる。
ハートをもう一度押してもらう。**理由:** Modal クローズと保存完了が同時だと UX が
ジャンピーになりやすい + 試行 → サインインを促す → 確認のため意図的にもう一度押す
の方が「保存した感」が出る。

### 6.3 RecipeHero の更新

既存の `isSaved` prop を `savedState: 'unsaved' | 'saved' | 'unauthenticated'` に拡張。
未サインイン時はハート上に小さな吹き出し「サインインしてピザ帳に保存」を出す
(デザイン 12 ・ HeartMiniHero の state=guest を参照)。

---

## 7. /library 画面

### 7.1 ルーティング

```
app/library/
  page.tsx               ← server component (params 解決のみ)
  _components/
    LibraryClient.tsx    ← client; useAuth + useSavedRecipes()
    LibraryClient.module.css
```

### 7.2 useSavedRecipes フック (一覧)

```ts
// src/hooks/use-saved-recipes.ts
export function useSavedRecipes() {
  const { status, user } = useAuth();
  const [items, setItems] = useState<SavedRecipe[] | null>(null);
  useEffect(() => {
    if (status !== 'authenticated' || !user) { setItems(null); return; }
    const q = query(
      collection(db, 'users', user.uid, 'savedRecipes'),
      orderBy('savedAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => d.data() as SavedRecipe));
    });
    return unsub;
  }, [status, user?.uid]);
  return items;
}
```

### 7.3 LibraryClient レイアウト

```
┌────────────────────────────────────┐
│ topRow: ← / 「ピザ帳」 / Avatar    │
├────────────────────────────────────┤
│ ScreenHero                         │
│  eyebrow MY LIBRARY                │
│  title「あなたの一枚を、/ 集める。」│
│  「保存中 N 件」                    │
├────────────────────────────────────┤
│ ProfileStrip                       │
│  [Avatar] 名前               [サインアウト] │
│           メール                    │
├────────────────────────────────────┤
│ LibraryCard × N                    │
│  または 空状態 (大型ハート枠)       │
└────────────────────────────────────┘
```

- 未サインイン時は SignInModal を強制 open (もしくは / に redirect)
- items が空配列なら空状態を、null なら skeleton を表示

### 7.4 LibraryCard

```tsx
function LibraryCard({ item, onUnsave }) {
  const router = useRouter();
  return (
    <div className={styles.card} onClick={() => router.push(`/recipes/${item.candidateId}`)}>
      <img src={item.imageUrl} className={styles.thumb} alt="" />
      <div className={styles.body}>
        <h3 className={styles.title}>{item.title}</h3>
        <div className={styles.meta}>
          <span className={`${styles.seal} ${styles[item.strategy]}`}>
            {STRATEGY_LABELS[item.strategy].japaneseLabel}
          </span>
          <span className={styles.locale}>{item.prefecture.replace('県', '')}</span>
        </div>
        <p className={styles.date}>{formatDate(item.savedAt)}</p>
      </div>
      <button className={styles.heart} onClick={(e) => { e.stopPropagation(); onUnsave(); }}>
        ♥
      </button>
    </div>
  );
}
```

---

## 8. TOP ページ (`/`)

### 8.1 ルーティング更新

**現状:** `/` は `HomeRedirector` で `localStorage.locale` の有無に応じて redirect。

**Slice 4:** `/` を実画面化し、リダイレクトロジックをページ内に組み込む:
- マウント時: `useLocale()` の `isHydrated` を待ち、`localeId` 有 → `/local` に replace
- `localeId` 無 (初回訪問者) → TOP ページの中身を表示

### 8.2 TopClient レイアウト

デザイン `TopScreen()` (slice4-screens.jsx:74) に準拠:
- 上部に 3 戦略印 (opacity 0.42, 縮小 0.7) のオーナメント
- 中央: eyebrow + 大型明朝 + サブ本文
- 下部固定: 「始める →」朱 CTA + 「すでにはじめている方 →」サブリンク + 「サインインしてピザ帳を開く」テキストリンク
- フッタ: `MAKE LOCAL PIZZA RECIPE AGENT · 2026`

### 8.3 CTA 挙動

| CTA | 動作 |
| --- | --- |
| 「始める →」 | `router.push('/local')` (localStorage はそのまま) |
| 「すでにはじめている方 →」 | `router.push('/local')` (同上、視覚的に控えめなだけ) |
| 「サインインしてピザ帳を開く」 | `openModal()` (Modal が開く)。サインイン成功後は `router.push('/library')` |

---

## 9. AvatarButton (全画面ヘッダー右上)

```tsx
// src/components/auth/AvatarButton.tsx
export function AvatarButton() {
  const { status, user } = useAuth();
  const router = useRouter();
  if (status !== 'authenticated' || !user) return null;
  return (
    <button
      className={styles.avatar}
      aria-label="ピザ帳を開く"
      onClick={() => router.push('/library')}
    >
      {user.photoURL ? <img src={user.photoURL} alt="" /> : <span>{user.displayName?.[0] ?? 'P'}</span>}
    </button>
  );
}
```

**配置場所:**
- `/local` の `LocalSelectClient` の topRow 右上
- `/ingredients` の `IngredientSelectClient` の topRow 右上 (既存「Tap 2 / 2」の隣)
- `/candidates` の `CandidatesClient` の topRow 右上 (既存「↻ ふり直す」の左 or 右)
- `/recipes/[id]` の `DetailClient` — RecipeHero 内ハートと干渉しないよう topRow を新設
- `/library` の topRow 右上

未サインイン時は描画しない (NULL を返す)。

---

## 10. Python 側変更 (image_agent + Port 移行)

### 10.1 image_agent → GCS put

```python
# agent/src/makelocal_agent/agents/image_agent.py
async def run_image_for_candidate(*, ...) -> str:
    png_bytes = await client.generate_image(...)
    # Slice 3: base64 data URI を返していた
    # Slice 4: GCS に put して URL を返す
    bucket = get_storage_bucket()
    blob = bucket.blob(f"recipes/{candidate_id}.png")
    blob.upload_from_string(png_bytes, content_type="image/png")
    blob.make_public()
    return blob.public_url
```

ImagenClient の `generate_image` は変更なし (PNG bytes を返す)。
新規 `StorageClient` Protocol を導入し、Mock 実装も用意:

```python
# agent/src/makelocal_agent/lib/storage.py
class StorageClient(Protocol):
    def upload_image(self, key: str, png_bytes: bytes) -> str: ...

class MockStorageClient:  # CI / unit test
    def upload_image(self, key, png_bytes):
        return f"http://localhost:9199/recipes/{key}.png"

class FirebaseStorageClient:  # Emulator + 本番
    def __init__(self, bucket_name: str, *, use_emulator: bool = False): ...
    def upload_image(self, key, png_bytes):
        bucket = self._client.bucket(self.bucket_name)
        blob = bucket.blob(f"recipes/{key}.png")
        blob.upload_from_string(png_bytes, content_type='image/png')
        if not self.use_emulator: blob.make_public()
        return blob.public_url
```

### 10.2 StreamEvent `image.ready` の更新

Python (Pydantic) と TS (Zod) の両方で `dataUri` → `url` に変更。
これは破壊変更 (Slice 3 と互換なし) だが、Slice 3 の base64 を残す価値が低いため
ばっさり置換。`useRecipeDetailStream` の state も `imageDataUri` → `imageUrl` に。

### 10.3 Port 移行

- `agent/Dockerfile` / `agent/src/makelocal_agent/main.py` の uvicorn 起動 port を 8001
- `.devcontainer/devcontainer.json` の forwardPorts / portsAttributes
- `.env.example` の `AGENT_BASE_URL=http://localhost:8001`
- `README.md` / steering 文書を grep 置換
- `package.json` の `test:e2e` (もし port hardcode あれば)

---

## 11. Emulator 起動構成

### 11.1 firebase.json

```json
{
  "emulators": {
    "auth":      { "port": 9099 },
    "firestore": { "port": 8080 },
    "storage":   { "port": 9199 },
    "ui":        { "enabled": true, "port": 4000 },
    "singleProjectMode": true
  },
  "firestore": { "rules": "firestore.rules" },
  "storage":   { "rules": "storage.rules" }
}
```

### 11.2 起動コマンド

```bash
# 別ターミナル
firebase emulators:start --project=mlpr-local
# UI: http://localhost:4000
```

### 11.3 .firebaserc

```json
{ "projects": { "default": "mlpr-local" } }
```

---

## 12. 環境変数 (Slice 4 で追加)

```bash
# Firebase (Slice 4)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mlpr-local
NEXT_PUBLIC_FIREBASE_API_KEY=fake-api-key-emulator
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=mlpr-local.firebaseapp.com
NEXT_PUBLIC_FIREBASE_APP_ID=1:0:web:0
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true

# Agent (Slice 4 で port 変更)
AGENT_BASE_URL=http://localhost:8001

# Agent 側 (Slice 4 で追加)
MLPR_USE_MOCK_STORAGE=true          # Mock の StorageClient を使う (CI / オフライン)
MLPR_FIREBASE_STORAGE_BUCKET=mlpr-local.appspot.com
MLPR_FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199
```

---

## 13. ディレクトリ追加 (Slice 4 終了時点)

```
src/
├── components/
│   ├── auth/
│   │   ├── AvatarButton.tsx                ← NEW
│   │   ├── AvatarButton.module.css         ← NEW
│   │   ├── SignInModal.tsx                 ← NEW
│   │   ├── SignInModal.module.css          ← NEW
│   │   ├── GoogleButton.tsx                ← NEW
│   │   └── GoogleButton.module.css         ← NEW
│   ├── library/
│   │   ├── LibraryCard.tsx                 ← NEW
│   │   ├── LibraryCard.module.css          ← NEW
│   │   ├── ProfileStrip.tsx                ← NEW
│   │   └── ProfileStrip.module.css         ← NEW
│   └── notify/
│       ├── Toast.tsx                       ← NEW
│       ├── Toast.module.css                ← NEW
│       ├── ToastHost.tsx                   ← NEW
│       └── ToastHost.module.css            ← NEW
├── hooks/
│   ├── use-auth.tsx                        ← NEW
│   ├── use-sign-in-modal.tsx               ← NEW
│   ├── use-toast.tsx                       ← NEW
│   ├── use-saved-recipe.ts                 ← NEW
│   └── use-saved-recipes.ts                ← NEW
├── lib/
│   ├── firebase/
│   │   ├── client.ts                       ← NEW (singleton init)
│   │   └── saved-recipe.ts                 ← NEW (型 + Firestore CRUD ヘルパ)
│   └── storage-keys.ts                     ← (Slice 3 で集約済み)
└── domain/
    └── saved-recipe.ts                     ← NEW (SavedRecipe 型)

app/
├── layout.tsx                              ← extend (AuthProvider / SignInModalProvider / ToastProvider をラップ)
├── _components/
│   └── HomeRedirector.tsx                  ← refactor (TOP に組み込み)
├── page.tsx                                ← refactor (TOP 画面化)
└── library/
    ├── page.tsx                            ← NEW
    └── _components/
        ├── LibraryClient.tsx               ← NEW
        └── LibraryClient.module.css        ← NEW

app/recipes/[candidateId]/_components/
├── DetailClient.tsx                        ← extend (ハート → Firestore + Toast)
└── DetailClient.module.css                 ← extend (ハート 3 状態 / 旧「保存」ボタン削除)

agent/src/makelocal_agent/
├── lib/
│   └── storage.py                          ← NEW (StorageClient + Mock + FirebaseStorageClient)
├── agents/
│   └── image_agent.py                      ← extend (PNG → GCS put → URL)
├── domain/
│   └── stream.py                           ← extend (image.ready の shape 変更)
├── deps.py                                 ← extend (get_storage_client)
└── main.py                                 ← edit (uvicorn port 8001)

(repo root)
├── firebase.json                           ← NEW
├── firestore.rules                         ← NEW
├── storage.rules                           ← NEW
├── .firebaserc                             ← NEW
└── .env.example                            ← extend (Firebase * 5 行追加)
```

---

## 14. テスト戦略

### 14.1 Python (`pytest`)

- `test_lib_storage.py`: MockStorageClient で put → URL 返却
- `test_image_agent_storage.py`: image_agent が PNG → StorageClient → URL を返すフロー
- `test_domain_stream_image_url.py`: image.ready が `{ url }` shape を受理する (旧 dataUri は reject)

### 14.2 TypeScript (`vitest`)

- `firebase/client.test.ts`: Emulator フラグで connect されること (環境変数で振り分け)
- `use-auth.test.tsx`: onAuthStateChanged のフックが status 遷移 (loading → authenticated)
- `use-saved-recipe.test.tsx`: save/unsave/onSnapshot を Firestore Emulator 経由で検証
- `use-toast.test.tsx`: push → 2.5s 後に消える / 手動 close で即消える
- `SignInModal.test.tsx`: open/close + Google ボタンクリックで signInWithGoogle 呼ばれる
- `AvatarButton.test.tsx`: 未サインイン NULL / サインイン済みは photoURL or イニシャル
- `LibraryCard.test.tsx`: クリックで /recipes 遷移 / ハートで onUnsave 呼ばれる
- `Toast.test.tsx` / `ToastHost.test.tsx`: 3 トーン描画 / dismiss / auto close

### 14.3 Firebase Security Rules テスト

- `tests/firestore-rules.test.ts` (Playwright とは別、`firebase emulators:exec` で起動)
- 別 uid からの read/write は deny
- 同 uid からの read/write は allow
- 未認証は deny

### 14.4 E2E (Playwright)

ジャーニーを延長:
```
/ → 始める →   (既存)
/local → 宮城 →
/ingredients → 食材 2 つ + 「3 案つくらせる」 →
/candidates → 決める →
/recipes/[id] → ハート → Modal → Google ボタン (Firebase Auth Emulator の自動ログイン) →
ハートが朱で塗りつぶし + Toast 確認 →
アバタータップ → /library 一覧に 1 件 →
プロフィール帯のサインアウト → / (TOP) に redirect →
完了
```

Playwright の `webServer` に Firebase Emulator も合わせて起動する (concurrently or 別 step)。

---

## 15. 影響範囲分析

| 既存ファイル | 影響 |
| --- | --- |
| `app/page.tsx` + `_components/HomeRedirector.tsx` | refactor (TOP 画面化、redirect は内部に) |
| `app/layout.tsx` | AuthProvider / SignInModalProvider / ToastProvider を `<body>` 直下にラップ |
| `app/local/_components/LocalSelectClient.tsx` | topRow に AvatarButton 追加 |
| `app/ingredients/_components/IngredientSelectClient.tsx` | 同上 |
| `app/candidates/[sessionId]/_components/CandidatesClient.tsx` | 同上 |
| `app/recipes/[candidateId]/_components/DetailClient.tsx` | ハート挙動を Firestore に / 「ピザ帳に保存」ボタン削除 / トースト連携 / topRow に AvatarButton |
| `src/components/recipe/RecipeHero.tsx` | `isSaved` prop を `savedState` 3 値に拡張、未サインイン用ガイド表示 |
| `src/hooks/use-recipe-detail-stream.ts` | `imageDataUri` → `imageUrl` rename |
| `src/domain/schemas.ts` | `image.ready` の dataUri → url (Zod) |
| `agent/src/.../domain/stream.py` | image.ready の Pydantic schema 変更 |
| `agent/src/.../agents/image_agent.py` | StorageClient 呼び出しに変更 |
| `agent/src/.../deps.py` | get_storage_client 追加 |
| `agent/src/.../main.py` | uvicorn port 8001 |
| `.devcontainer/devcontainer.json` | forwardPorts / portsAttributes 更新 (8001 追加、8080 を Firestore に再ラベル) |
| `.env.example` | Firebase * 5 行 + MLPR_USE_MOCK_STORAGE + AGENT_BASE_URL=...8001 |
| `tests/e2e/journey.spec.ts` | TOP → サインイン → 保存 → /library → サインアウトまで延長 |
| `tests/e2e/playwright.config.ts` | webServer に Firebase Emulator 起動を追加 |
| `package.json` | firebase / firebase-admin 依存追加、`emulators` スクリプト追加 |
| `pyproject.toml` (agent) | `google-cloud-storage` 依存追加 |
| `.github/workflows/ci.yml` | E2E job で firebase emulators:exec を使う |
| `README.md` | Slice 4 動作手順 (Emulator 起動 + 環境変数) |

---

## 16. 設計上のリスク・トレードオフ

| 項目 | 採用案 | 代替案 | 採用理由 |
| --- | --- | --- | --- |
| Auth プロバイダ | Google のみ | Anonymous + link | 実装最小、ハッカソンには十分 |
| Firestore アクセス | client SDK 直 | BFF 経由 | Slice 4 はサーバ間でトークン伝搬不要 |
| 保存スナップショット | imageUrl のみ | レシピ本文も保存 | 再生成のジャーニーを再利用、開く度に最新 |
| Modal 実装 | `<dialog>` ネイティブ | カスタム Portal | a11y/backdrop/ESC 全部組み込み |
| Toast | 自前 + Context | toast ライブラリ (sonner 等) | デザイントークン適用が楽 |
| 画像ストレージ | Firebase Storage Emulator | Agent ローカルファイル | 本番との同等性 + URL 配信が容易 |
| Auth state 同期 | Firebase の `onAuthStateChanged` | Cookie + middleware | client-only でシンプル、SSR Auth は Slice 5+ |

---

## 17. 改訂履歴

| 日付 | 版 | 変更内容 |
| --- | --- | --- |
| 2026-05-17 | 1.0 | 初版作成 (Claude Design 成果を反映) |
