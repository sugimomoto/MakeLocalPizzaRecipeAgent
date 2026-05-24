/**
 * SavedRecipe — ピザ帳 (Firestore) に保存される 1 件のスナップショット。
 *
 * Slice 4 で導入。Slice 6 で詳細スナップショット (candidate + recipe detail) を
 * 追加保存することで /library から開いたときに **再生成せずに表示** できるよう
 * 拡張した (背景: 再生成は dummy candidate で 400 / 毎回 LLM 課金が発生)。
 *
 * `users/{uid}/savedRecipes/{candidateId}` ドキュメントの shape:
 *
 * - candidateId をドキュメント ID にする (重複保存防止 + ハートトグルが冪等)
 * - candidate snapshot (concept / keyIngredients / sceneTags / why) を保存
 * - recipe detail snapshot (meta / materials / steps / story) を保存
 * - 画像は imageUrl として持つ (Imagen 再生成コスト削減)
 * - savedAt は Firestore serverTimestamp() で書く前提
 *
 * 後方互換: detail フィールドは optional。古いドキュメント (Slice 4 / 5 で
 * 保存したもの) は detail を持たないので、UI 側は fallback して再生成する。
 */

import type { Strategy } from './candidate';
import type { Feedback } from './feedback';
import type { IngredientId } from './ingredient';
import type { LocaleId } from './locale';
import type { RecipeMaterial, RecipeMeta, RecipeStory } from './recipe';

export type SavedRecipe = {
  // ── 既存フィールド (Slice 4) ─────────────────────────────────────────
  candidateId: string;
  title: string;
  localeId: LocaleId;
  prefecture: string;
  strategy: Strategy;
  imageUrl: string;
  /**
   * Firestore Timestamp。client SDK では Date or Firestore Timestamp が入る。
   * 表示時は `formatDate` ヘルパで整形する。
   */
  savedAt: Date;
  /** 詳細画面再訪問時に snapshot ingredients を渡すため (任意) */
  ingredients?: IngredientId[];

  // ── 候補スナップショット (Slice 6 追加、optional で後方互換) ─────────
  /** 候補のコンセプト文 (候補画面で表示していたもの) */
  concept?: string;
  /** 候補の主役食材 (画像 prompt や材料リストの基礎) */
  keyIngredients?: string[];
  /** 候補のシーンタグ */
  sceneTags?: string[];
  /** 候補の戦略理由 */
  why?: string;

  // ── 詳細スナップショット (Slice 6 追加、optional で後方互換) ─────────
  /** 詳細レシピのメタ (人数 / 時間 / 焼成温度 / 難易度) */
  meta?: RecipeMeta;
  /** 詳細レシピの材料リスト */
  materials?: RecipeMaterial[];
  /** 詳細レシピの手順 */
  steps?: string[];
  /** 詳細レシピのストーリーカード */
  story?: RecipeStory;

  // ── フィードバック (Slice 7 追加、optional で後方互換) ────────────────
  /** 「作ってみた」の評価記録。未記録の SavedRecipe では undefined */
  feedback?: Feedback;
};

/**
 * 保存時に書き込むデータ (savedAt は server-side で付与するため除外)。
 * `setDoc(ref, { ...snapshot, savedAt: serverTimestamp() })` の形で使う。
 */
export type SavedRecipeSnapshot = Omit<SavedRecipe, 'savedAt'>;

/**
 * SavedRecipe が「完全なスナップショット」を持っているか判定する。
 * /library から開いた詳細画面が再生成不要かを判断するために使う。
 *
 * Slice 6 で追加した detail フィールドが揃っていれば true。
 */
export function hasFullSnapshot(
  recipe: Pick<SavedRecipe, 'meta' | 'materials' | 'steps' | 'story' | 'keyIngredients'>,
): boolean {
  return Boolean(
    recipe.meta &&
    recipe.materials &&
    recipe.materials.length > 0 &&
    recipe.steps &&
    recipe.steps.length > 0 &&
    recipe.story &&
    recipe.keyIngredients &&
    recipe.keyIngredients.length > 0,
  );
}

/**
 * Slice 7: フィードバックが記録されているか (= 「作った」状態) の判定。
 * 振り返り帳 /journal のフィルタ + 保存帳 /library の「作った」サブバッジで使う。
 *
 * overallRating が 1 以上なら「作った」扱い。0 (未評価) や undefined は false。
 */
export function hasFeedback(recipe: Pick<SavedRecipe, 'feedback'>): boolean {
  return Boolean(recipe.feedback && recipe.feedback.overallRating >= 1);
}
