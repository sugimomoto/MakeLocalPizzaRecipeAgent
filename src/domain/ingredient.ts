/**
 * Ingredient (食材) ドメイン型。
 *
 * - 食材は地元 (LocaleId) に紐づく
 * - 旬 (Season) は複数許容: 例 ["winter", "spring"]
 * - searchQuery は楽天ふるさと納税 API 検索用 (Slice 5)
 */

import type { LocaleId } from './locale';

export type IngredientId = string;

export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'all-year';

export type IngredientCategory = 'vegetable' | 'seafood' | 'cheese' | 'grain' | 'meat' | 'fruit';

export type Ingredient = {
  id: IngredientId;
  localeId: LocaleId;
  name: string;
  searchQuery?: string;
  category: IngredientCategory;
  seasons: Season[];
  story?: string;
};

export const SEASONS: readonly Season[] = [
  'spring',
  'summer',
  'autumn',
  'winter',
  'all-year',
] as const;

export const INGREDIENT_CATEGORIES: readonly IngredientCategory[] = [
  'vegetable',
  'seafood',
  'cheese',
  'grain',
  'meat',
  'fruit',
] as const;

export function isSeason(value: unknown): value is Season {
  return typeof value === 'string' && (SEASONS as readonly string[]).includes(value);
}

export function isIngredientCategory(value: unknown): value is IngredientCategory {
  return typeof value === 'string' && (INGREDIENT_CATEGORIES as readonly string[]).includes(value);
}

/**
 * 指定した季節に該当する食材かを判定する。
 * "all-year" は常に true を返す。
 */
export function isInSeason(ingredient: Ingredient, season: Season): boolean {
  return ingredient.seasons.includes('all-year') || ingredient.seasons.includes(season);
}
