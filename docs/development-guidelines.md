# 開発ガイドライン(Development Guidelines)

> 本書は **ふるさとピザ帳** (技術名: MakeLocalPizzaRecipeAgent) 開発時のコーディング規約・命名規則・スタイリング規約・テスト規約・Git 規約を定義する。
> リポジトリ構造は [repository-structure.md](repository-structure.md)、技術スタックは [architecture.md](architecture.md) を参照。

---

## 1. 基本姿勢

### 1.1 価値観

1. **動くコードを最短距離で**: ハッカソン締切(2026/7/10) 優先。完璧主義より完成優先
2. **DevOps 一式の完成を優先**: 機能の幅より、CI/CD・IaC・可観測性が一通り動く状態を優先
3. **公開リポジトリとして恥ずかしくない品質**: 審査員に読まれる前提で書く
4. **後で読む自分のために書く**: 個人開発でも、未来の自分は他人
5. **Web と Agent の境界を尊重**: ポリグロット構成なので、責務とインターフェースを明確に保つ

### 1.2 やらないこと

- 過剰な抽象化(「将来の拡張のために」は罠)
- テストカバレッジ 100% への執着(重要パスのみで OK)
- 複数 UI テーマの導入(和モダンの単一テーマで統一)
- ウィザード・多段対話の復活(Quick Tap を維持)
- 自前認証の実装(Firebase Auth に任せる)
- 言語混在(Agent 内に TS、Web 内に Python を持ち込まない)

---

## 2. 言語・型

### 2.1 TypeScript

- **strict モード必須**(`strict: true`, `noUncheckedIndexedAccess: true`)
- `any` は禁止、必要なら `unknown` から narrow する
- 型推論で済むところは型注釈を書かない
- 関数の引数・戻り値の型は **公開境界(export 関数)では明示**、内部関数は推論で OK
- 型アサーション `as` は最小限。`satisfies` を優先

### 2.2 Python

- **Python 3.12+** を前提(union 型の `X | Y` 構文等を使用)
- `mypy --strict` で重要モジュールをチェック
- 型ヒント必須(関数の引数・戻り値)
- `Any` は禁止、必要なら `object` から narrow
- データクラスは **Pydantic v2** を優先(API 入出力と内部モデルを統一)
- 例外は明示的に raise、bare `except` 禁止

### 2.3 スキーマと型の関係

- **Single Source of Truth は Zod (TS) / Pydantic (Python)**
- TS: `z.infer<typeof Schema>` で型を導出
- Python: `class Foo(BaseModel)` の Pydantic モデルをそのまま型として利用
- API 境界では必ず parse/validate を通してから処理
- ドメインモデル・Firestore I/O も同じスキーマを共有

### 2.4 null / undefined / None

- TS: 「存在しない」は `null`、未定義は `undefined`。オプショナル `?:` は明示的に `undefined` を許可しない
- Python: `None` を一義的に使用

### 2.5 TS / Python 間のスキーマ同期

- `src/domain/schemas.ts` と `agent/src/makelocal_agent/domain.py` のフィールド名・型は **意味的に同期**させる
- 同期破壊を防ぐため、PR では両方を同時に変更する
- 将来的に共通スキーマを `.json-schema` で持つ案もあるが、MVP では手動同期

---

## 3. 命名規則

### 3.1 識別子(TS)

| 対象 | 形式 | 例 |
| --- | --- | --- |
| 変数・関数 | camelCase | `currentSession`, `loadFeedback` |
| 定数(モジュールレベル) | UPPER_SNAKE_CASE | `MAX_INGREDIENTS`, `DEFAULT_STRATEGY` |
| 型・インターフェース・クラス | PascalCase | `Recipe`, `Candidate`, `FeedbackPayload` |
| 文字列リテラル union | 小文字 | `'exploit' \| 'tune' \| 'explore'` |
| React コンポーネント | PascalCase | `CandidateCard`, `StrategySeal` |
| カスタムフック | use + camelCase | `useAuth`, `useQuickTapStream` |
| ファイル名 | [repository-structure.md §4](repository-structure.md#4-ファイル命名規則) 参照 | — |

### 3.2 識別子(Python)

| 対象 | 形式 | 例 |
| --- | --- | --- |
| 変数・関数 | snake_case | `current_session`, `load_feedback` |
| 定数 | UPPER_SNAKE_CASE | `MAX_INGREDIENTS` |
| クラス | PascalCase | `class Candidate`, `class QuickTapSession` |
| モジュール・ファイル | snake_case | `candidates_agent.py` |

### 3.3 ドメイン用語

コード内のドメイン用語は [glossary.md](glossary.md) に従う。日本語・英語の対応表が一義的。

- ❌ `chefSession`(造語)→ ✓ `quickTapSession`
- ❌ `dialog`(廃止概念)→ ✓ `quicktap`
- ❌ `theme`(料理の意で曖昧)→ ✓ `recipeTheme`

### 3.4 ブール変数

- 状態を表すなら `is`/`has`/`can`/`should` プレフィックス
- 例: `isLoading`, `hasFeedback`, `canRegenerate`

### 3.5 イベントハンドラ(TS)

- `on` プレフィックス: prop 名(`onSubmit`, `onPick`)
- `handle` プレフィックス: コンポーネント内ハンドラ(`handleSubmit`, `handlePick`)

### 3.6 戦略軸の命名

- 文字列リテラル: `'exploit' | 'tune' | 'explore'`(小文字、英語)
- 日本語表示: 「王道 / 一歩外す / 大冒険」(UI 上のラベル)
- コード上は必ず英語 ID を使う(i18n の観点でも有利)

---

## 4. スタイリング規約

### 4.1 基本方針

- **CSS Modules + CSS 変数**(Tailwind は不採用、和モダンの紙質感を再現するため)
- グローバルは `app/globals.css` と `src/styles/` のみ。それ以外は CSS Modules
- デザイントークンは `src/styles/tokens.css` に集約(`design/pizza-tokens.jsx` の `T` 由来)
- インライン style は禁止(動的な値のみ例外的に許可)

### 4.2 単一テーマ

- 和モダン×温かみのみ(craft/editorial/wa の複数テーマは持たない)
- 切替の余地を意識した CSS 変数構造にはしない(過剰な抽象化を避ける)

### 4.3 レスポンシブ

- モバイルファースト(基準幅 393px、design/ のプロトタイプに整合)
- ブレークポイント: 768px(タブレット以上)/ 1024px(デスクトップ)
- メディアクエリは CSS Modules 内で記述

### 4.4 アニメーション

- `prefers-reduced-motion` を必ず尊重
- 焼成中演出はピザが焼ける情緒的なアニメーション(プロトタイプ参照)
- 派手な動きは避け、フェード・スライド程度に留める

---

## 5. React 実装規約

### 5.1 Server Component / Client Component

- **デフォルトは Server Component**(Next.js App Router の方針)
- `'use client'` を付けるのは以下の場合のみ:
  - useState / useEffect 等のフックを使う
  - イベントハンドラを定義する
  - ブラウザ専用 API(`localStorage`, `IntersectionObserver` 等)を使う
- データフェッチは Server Component で `fetch()` または直接 Firestore Admin を使う

### 5.2 コンポーネント設計

- 1 ファイル 1 コンポーネント原則
- props は inline 型定義 OK(小さい)。共有する場合は `types.ts`
- props バリデーションは TypeScript で十分
- `forwardRef` は必要時のみ

### 5.3 状態管理

- ローカル状態: `useState`
- フォーム: React Hook Form は MVP では使わず、`useState` ベース(Quick Tap が単純なため)
- グローバル状態: Zustand
  - 認証ユーザー、Quick Tap セッション情報など
  - **localStorage 連動は `useSyncExternalStore` ベースのカスタムフック**で実装(`use-locale.ts`)

### 5.4 データ取得

- Server Component → 直接 `firestore.ts` を呼ぶ
- Client Component → `/api` 経由で fetch
- ストリーム受信は `useQuickTapStream` カスタムフックに集約

---

## 6. API ルート(BFF)実装規約

### 6.1 ルートハンドラの基本形

```ts
// app/api/quicktap/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuthOptional } from '@/lib/http/with-auth';
import { withSpan } from '@/lib/observability/span';
import { logger } from '@/lib/observability/logger';
import { CreateQuickTapSessionSchema } from '@/domain/schemas';
import { agentClient } from '@/lib/agent/client';

export const POST = withAuthOptional(async (req: NextRequest, ctx) => {
  return withSpan('api.quicktap.sessions.create', async () => {
    const body = CreateQuickTapSessionSchema.parse(await req.json());
    logger.info({ event: 'quicktap.session.start', userId: ctx.userId, ingredients: body.ingredients });
    const stream = await agentClient.generateCandidates(body, ctx);
    return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson' } });
  });
});
```

### 6.2 必須要素

- **認証**: 認証必須なら `withAuth`、無認証許可なら `withAuthOptional` ラッパ
- **入力検証**: Zod スキーマで `parse()`
- **トレース**: `withSpan` で span 化
- **ログ**: 重要イベントは構造化ログ
- **エラー**: `try/catch` ではなく共通エラーハンドラに任せる

### 6.3 レスポンス形式

- 成功(通常): `{ data: ... }`
- 成功(ストリーム): NDJSON で 1 行 1 イベント([functional-design.md §6.2](functional-design.md#62-ストリーム出力))
- 失敗: `{ error: { code: 'string', message: 'string' } }`
- ステータスコード: 400/401/404/429/500 を適切に

### 6.4 やってはいけないこと

- ❌ Gemini API キーをクライアントに渡す
- ❌ Firestore のクライアント SDK をルートハンドラで使う(admin SDK を使う)
- ❌ console.log で運用ログを出す(必ず logger 経由)
- ❌ mlpr-agent を IAM 認証なしで呼び出す

---

## 7. エージェント・ツール実装規約(Python)

### 7.1 ツール定義の基本

- 1 ファイル 1 ツール(`agent/src/makelocal_agent/tools/*.py`)
- ツール定義は ADK のスキーマに従う:
  - 明確な `name`(snake_case)
  - **詳細な `description`**(エージェントの自律選択の根拠なので最重要)
  - 厳密な入出力 Pydantic モデル

### 7.2 `description` の書き方

ハードコードを排除し、Gemini が状況に応じて自律選択できる設計にするため、`description` には以下を含める:

1. **何を返すツールか**(What)
2. **いつ使うべきか**(When)
3. **入力例と期待される効果**(How)

### 7.3 ツール内部の規約

- Firestore / Gemini / Imagen 呼び出しは Python の専用クライアント経由(直接 SDK を呼ばない)
- ツール内でログ・トレース必須(`agent.tool.{tool_id}` の span 名)
- 失敗時は明示的に例外を raise(エージェントは Gemini が判断する)
- 楽天 API への直接アクセスは**禁止**(`refresh_furusato_cache.py` のみ)

### 7.4 プロンプト

- システムプロンプトは `agent/src/makelocal_agent/agents/prompts/system.py`
- バージョン番号を持たせる(`candidates_v1.py`, `candidates_v2.py`)
- プロンプト変更は PR 単位で行い、Vertex AI Gen AI Evaluation でスコア比較

### 7.5 Exploit / Tune / Explore の戦略実装

- 3 案を **構造化出力(JSON スキーマ指定)** で 1 コールで生成、または 3 並行コール
- どちらを採用するかはコスト・レイテンシ計測で決定(MVP は 1 コール、悪化時に並行化)
- プロンプトには「3 案は互いに異なる方向性で生成すること」を明示
- 戦略軸ごとの具体的選定基準はハードコードせず、Gemini に委ねる

---

## 8. ロギング・トレース規約

### 8.1 ロガー使用ルール

- TS: すべてのログは `src/lib/observability/logger.ts` 経由
- Python: `agent/src/makelocal_agent/observability.py` 経由
- `console.log` / `print()` 禁止(ESLint / ruff で強制)
- 構造化ログ(オブジェクト/dict 渡し)必須

### 8.2 ログレベル

| レベル | 用途 |
| --- | --- |
| `debug` | 開発時のみ。本番では出ない |
| `info` | 通常イベント(候補生成開始、ツール選択、フィードバック保存) |
| `warn` | 想定外だが処理は継続(リトライ成功、レート制限ヒット等) |
| `error` | 例外・処理失敗。Error Reporting に飛ばす |

### 8.3 必須フィールド

すべてのログに含める:

- `timestamp`(自動)
- `severity`(自動)
- `requestId` / `userId`(認証時) or `guestSessionId`(無認証時) / `sessionId`
- `event`(イベント名、`quicktap.session.start` など)
- 候補生成系では `strategy`(`exploit` / `tune` / `explore`)

### 8.4 PII の扱い

- メールアドレス、ユーザーの本文、ゲストの実名等は**ログに残さない**
- userId は OK(社内識別子で個人特定不可)
- フィードバックコメントは要約・ハッシュ化してから記録、または記録しない

### 8.5 トレース

- 重要処理は必ず `withSpan`(TS)/ `with_span`(Python)でラップ
- span 名は `<layer>.<operation>` 形式(`api.recipes.create`, `agent.candidate.exploit`)
- TS と Python 間の Trace は同じ trace ID で繋がるよう、HTTP ヘッダで伝播

---

## 9. テスト規約

### 9.0 進め方: TDD を基本とする

本プロジェクトの**振る舞いを持つコード**は **Red → Green → Refactor** の順で書く。

- **Red**: 失敗するテストを先に書く。テスト名で「このコードの責務」を言語化する
- **Green**: テストを通す**最小**実装
- **Refactor**: テストを保ったまま重複除去・命名整理・構造化

#### TDD を必ず適用する対象

- ドメインロジック・Zod / Pydantic スキーマ
- 観測性(`logger`, `with-span`)
- HTTP ヘルパ(`with-auth`, `error`)
- Firestore CRUD のロジック層
- エージェント・ツール
- API ルート(認証・バリデーション・エラー応答の契約を保証)
- 戦略軸ごとのプロンプト出力テスト(契約: JSON スキーマ準拠、3案揃う)

#### TDD を緩める対象

- Firebase / Gemini / Storage SDK の薄いラッパ初期化
- React Server Component の純レイアウト
- Next.js の `instrumentation.ts` / `middleware.ts`

#### TDD を適用しない対象

- 設定ファイル(`tsconfig.json`、`next.config.ts`、`eslint.config.mjs`、`vitest.config.ts`、`pyproject.toml` 等)
- IaC(Terraform)— `terraform validate` / `plan` で検証
- CI/CD ワークフロー(`.github/workflows/*`、`Dockerfile`)
- CSS / デザイントークン

### 9.1 何をテストするか(MVP の優先度)

- ✓ ドメイン層のロジック — ユニットテスト必須
- ✓ Zod / Pydantic スキーマ境界値 — ユニットテスト推奨
- ✓ 認証関連の重要パス — ユニットテスト必須
- ✓ 候補3案生成の契約(JSON スキーマ準拠、3案揃う、戦略軸が必ず付与) — 必須
- ✓ ハッピーパスの E2E スモーク(Playwright で Tap1→Tap2→候補→決定→フィードバック を 1〜2 本) — 必須
- △ UI コンポーネント — 重要なものだけ
- ✗ 100% カバレッジ — 不要

### 9.2 ユニットテスト(Vitest / pytest)

- TS: ファイル名 `xxx.test.ts`、対象と同ディレクトリにコロケーション
- Python: `agent/tests/` 配下、`test_xxx.py`
- AAA パターン(Arrange / Act / Assert)
- describe/it の階層は浅く(2 段まで)

### 9.3 E2E(Playwright)

- `tests/e2e/` に配置
- 重要シナリオのみ:
  - Tap1 → Tap2 → 候補3案到達
  - 候補1案決定 → 詳細レシピ + 画像表示
  - フィードバック保存
- CI でスモークだけ走らせ、フルは手元で実行

### 9.4 モック方針

- 外部 API(Gemini、Imagen、楽天) はモック
- Firestore はテストでは Emulator を使う(本物の DB を汚さない)
- mlpr-agent はテスト時に local 起動 or モック化

---

## 10. Git 規約

### 10.1 ブランチ戦略

- `main` — 常にデプロイ可能
- 機能開発: `feat/<short-description>`
- バグ修正: `fix/<short-description>`
- ドキュメント: `docs/<short-description>`
- リファクタ: `refactor/<short-description>`
- インフラ: `infra/<short-description>`

→ 個人開発のため複雑なブランチ戦略は避ける。**短命のトピックブランチ + main へ早期マージ**を基本。

### 10.2 コミットメッセージ(Conventional Commits)

形式:
```
<type>: <subject>

<body>
```

`<type>` の種類:

| type | 用途 |
| --- | --- |
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `docs` | ドキュメント |
| `style` | フォーマット(コード変更なし) |
| `refactor` | リファクタリング |
| `test` | テスト追加・修正 |
| `chore` | ビルド・ツール |
| `infra` | Terraform / CI/CD |
| `perf` | 性能改善 |

例:
```
feat: Quick Tap セッションに Exploit/Tune/Explore の戦略軸を導入

candidates_agent.py で 3 案を異なるプロンプト戦略で生成。
プロンプトはバージョン管理(candidates_v1.py)し A/B 比較可能に。
```

### 10.3 PR ルール

- 個人開発なので **PR のレビューは自分自身**で。ただし、必ず PR を経由する
- PR タイトルは Conventional Commits 準拠
- マージは Squash and merge を基本
- main 直 push は禁止(ブランチ保護)
- TS と Python の両方を変更する PR では、両方の lint/test 通過を必須

### 10.4 タグ

- リリースは `v0.1.0`, `v0.2.0` の SemVer
- prod デプロイは `v*` タグで GitHub Actions が起動

### 10.5 機密情報

- ❌ コミットしてはいけないもの:
  - `.env` / `.env.local` / `agent/.env`(実値)
  - サービスアカウント鍵(`*-key.json`)
  - API キー / シークレット
  - 楽天 API のキー
- pre-commit フック(lefthook)で `gitleaks` を走らせ、漏洩を機械的に検出

---

## 11. Lint / Format / 型チェック

### 11.1 ESLint(TS)

- ベース: `next/core-web-vitals`, `@typescript-eslint/recommended`
- 追加ルール:
  - `no-console`(`logger` 強制)
  - `import/order`
  - `import/no-restricted-paths`(依存方向の強制、[repository-structure.md §6](repository-structure.md#6-依存関係のルール))

### 11.2 ruff(Python)

- フォーマッタも兼ねる(Black 不要)
- `target-version = "py312"`
- 厳しめのルールセット(`E`, `F`, `I`, `N`, `UP`, `B`, `S`)を有効化
- `print` 使用禁止(`logger` 強制)

### 11.3 Prettier(TS)

- セミコロンあり、シングルクォート、行幅 100、末尾カンマあり
- 設定は `.prettierrc`、変更は基本しない

### 11.4 pre-commit(lefthook)

コミット前に実行:

1. ESLint(変更 TS ファイルのみ)
2. ruff check(変更 Python ファイルのみ)
3. Prettier check
4. TypeScript check(変更パッケージのみ)
5. `gitleaks` でシークレット検出

### 11.5 CI(GitHub Actions)

PR・push 時に実行(Node と Python は並列ジョブ):

**Node ジョブ**:
1. `pnpm install --frozen-lockfile`
2. `pnpm lint`
3. `pnpm typecheck`
4. `pnpm test`
5. `pnpm build`

**Python ジョブ**:
1. `uv sync --dev`
2. `uv run ruff check`
3. `uv run mypy src`
4. `uv run pytest`

---

## 12. ドキュメント規約

### 12.1 コードコメント

- **基本的に書かない**(識別子で意図を伝える)
- 書く場合は **Why** に集中(What/How はコードを読めば分かる)
- 良い例: `// Gemini のレート制限を避けるため最大 5 並列まで`
- 悪い例: `// session を取得`

### 12.2 README.md(リポジトリトップ)

ハッカソン提出時の名刺。以下を含める:

- プロダクト概要(1〜2 文 + デモ動画リンク)
- スクリーンショット
- ハッカソン関連リンク(ハッカソンページ、Proto Pedia)
- アーキテクチャ図(リンク or 埋め込み)
- セットアップ手順(ローカル実行・デプロイ)
- 技術スタック
- ライセンス

### 12.3 ドキュメント管理

- 永続的ドキュメント: `docs/` 配下、CLAUDE.md のルールに従い段階的に作成・承認
- 作業単位ドキュメント: `.steering/YYYYMMDD-<title>/` に新規作成
- 図表は Mermaid 推奨、複雑なものは `docs/images/` に画像配置

---

## 13. セキュリティ

### 13.1 入力検証

- すべての外部入力(HTTP / フォーム / URL パラメータ)は Zod / Pydantic で検証
- Gemini への入力は事前にサニタイズ(プロンプトインジェクション最低限の対策)
- 食材・地元の選択はホワイトリスト方式

### 13.2 出力エスケープ

- React のデフォルトエスケープに依存
- `dangerouslySetInnerHTML` は禁止(必要なら個別に承認)

### 13.3 認証・認可

- 認証必須エンドポイントは `withAuth` ラッパで Firebase ID Token 検証
- Firestore はユーザー UID で隔離されているため認可も自動
- mlpr-agent への呼び出しは IAM Cloud Run Invoker 必須

### 13.4 シークレット

- すべて Secret Manager 管理
- ローカル開発でも `.env.local` で個人管理(コミット禁止)

### 13.5 依存関係

- `pnpm audit` / `uv pip check` を CI で実行
- 重大な脆弱性が出たら即対応

---

## 14. パフォーマンス

### 14.1 フロント

- 画像は `next/image` を使う
- フォントは `next/font` でセルフホスト最適化
- Server Component を最大限活用、Client Component は最小限
- 候補画面・詳細画面では NDJSON ストリームを段階的レンダリングし、体感レイテンシを下げる

### 14.2 BFF

- mlpr-agent への呼び出しはストリーミング応答を中継(バッファリングしない)
- Firestore 読みは必要なフィールドのみ取得
- 楽天 API は直接呼ばず、Firestore キャッシュ参照のみ

### 14.3 Agent

- Gemini の軽量タスク(T5 学習トレイト抽出など)は **Flash** モデルを使用
- 候補生成は Pro モデル
- Imagen は詳細画面遷移時の 1 回のみ

### 14.4 コスト管理

- Imagen は詳細遷移時のみ
- Gemini はモデル使い分け(軽量タスクは Flash)
- Firestore のクエリは必要なフィールドのみ取得
- 楽天 API は cron でのみ(`refresh_furusato_cache.py`)

---

## 15. AI 開発支援ツールの活用

### 15.1 Claude Code

- `.mcp.json` で gcloud / observability MCP を有効化
- `.claude/skills/rakuten-furusato-api/SKILL.md` で楽天 API の実証ベース仕様を保持
- 開発・トラブルシュート時に積極活用
- ただし**生成されたコードはそのまま信用せず、必ずレビュー**

### 15.2 プロンプト改善

- システムプロンプトの変更は必ず PR 化し、Vertex AI Gen AI Evaluation で前後比較
- 戦略軸ごとに別々に評価する(Exploit のみ改善されて Explore が劣化していないか確認)

---

## 16. チェックリスト(PR マージ前)

- [ ] ESLint / Prettier / typecheck 通過(Node)
- [ ] ruff / mypy / pytest 通過(Python、該当 PR のみ)
- [ ] テスト追加・更新(必要箇所)
- [ ] PR タイトルが Conventional Commits 準拠
- [ ] シークレットが含まれていない(gitleaks 通過)
- [ ] ドキュメント更新(永続ドキュメントに影響する変更の場合)
- [ ] 動作確認(ローカル or dev 環境で実機確認)
- [ ] TS / Python のスキーマが乖離していないか確認(`src/domain/schemas.ts` と `agent/.../domain.py`)

---

## 17. 改訂履歴

| 日付 | 版 | 変更内容 |
| --- | --- | --- |
| 2026-05-13 | 1.0 | 初版作成。Web (TS) と Agent (Python) のポリグロット構成を明示。複数 UI テーマ・ウィザード・多段対話を排除。Quick Tap 単一動線、Exploit/Tune/Explore 戦略実装、ふるさと納税の楽天 API アクセス制限を規約化。 |
| 2026-05-24 | 1.1 | サービス名を「ふるさとピザ帳」に確定 (Slice 7、FR-7-8)。コーディング規約には影響なし。 |
