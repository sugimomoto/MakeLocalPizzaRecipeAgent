/**
 * SavedRecipe — ピザ帳 (Firestore) に保存される 1 件の最小スナップショット。
 *
 * Slice 4 で導入。`users/{uid}/savedRecipes/{candidateId}` ドキュメントの shape。
 *
 * 設計判断:
 * - candidateId をドキュメント ID にする (重複保存防止 + ハートトグルが冪等)
 * - 詳細レシピ (materials/steps/story) は保存しない — 開く度に再生成する
 *   (Slice 3 の generateRecipeDetail をそのまま再利用)
 * - 画像だけは imageUrl として持つ (Imagen 再生成コスト削減)
 * - savedAt は Firestore serverTimestamp() で書く前提
 */

import type { Strategy } from './candidate';
import type { IngredientId } from './ingredient';
import type { LocaleId } from './locale';

export type SavedRecipe = {
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
};

/**
 * 保存時に書き込むデータ (savedAt は server-side で付与するため除外)。
 * `setDoc(ref, { ...snapshot, savedAt: serverTimestamp() })` の形で使う。
 */
export type SavedRecipeSnapshot = Omit<SavedRecipe, 'savedAt'>;
