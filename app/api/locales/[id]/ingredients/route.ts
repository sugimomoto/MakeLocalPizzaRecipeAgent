/**
 * GET /api/locales/[id]/ingredients
 *
 * 指定地元の食材一覧を返す。クエリで絞り込み可:
 *   - ?season=spring|summer|autumn|winter|all-year
 *   - ?category=vegetable|seafood|cheese|grain|meat|fruit
 *
 * 不正な season/category は 400 (BAD_QUERY)、未知の locale は 404 (LOCALE_NOT_FOUND)。
 */

import generatedData from '@/data/ingredients.generated.json';
import { isInSeason, isIngredientCategory, isSeason } from '@/domain/ingredient';
import { apiError } from '@/lib/http/error';
import { withAuthOptional } from '@/lib/http/with-auth';

import type { Ingredient, IngredientCategory, Season } from '@/domain/ingredient';

type IngredientsResponse = {
  localeId: string;
  ingredients: Ingredient[];
};

export const dynamic = 'force-dynamic';

export const GET = withAuthOptional(async (request) => {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  // /api/locales/{id}/ingredients → segments[2] が id
  const id = segments[2];

  if (!id) {
    throw apiError.badRequest('BAD_REQUEST', 'locale id is required');
  }

  const locale = generatedData.locales.find((l) => l.id === id);
  if (!locale) {
    throw apiError.notFound('LOCALE_NOT_FOUND', `locale not found: ${id}`);
  }

  const seasonParam = url.searchParams.get('season');
  const categoryParam = url.searchParams.get('category');

  let season: Season | undefined;
  if (seasonParam !== null) {
    if (!isSeason(seasonParam)) {
      throw apiError.badRequest('BAD_QUERY', `invalid season: ${seasonParam}`);
    }
    season = seasonParam;
  }

  let category: IngredientCategory | undefined;
  if (categoryParam !== null) {
    if (!isIngredientCategory(categoryParam)) {
      throw apiError.badRequest('BAD_QUERY', `invalid category: ${categoryParam}`);
    }
    category = categoryParam;
  }

  // generated.json の ingredient は localeId フィールドを持たないので付与
  const ingredients: Ingredient[] = locale.ingredients.map((i) => {
    const base: Ingredient = {
      id: i.id,
      localeId: locale.id,
      name: i.name,
      category: i.category as IngredientCategory,
      seasons: i.seasons as Season[],
    };
    if (i.searchQuery) base.searchQuery = i.searchQuery;
    if (i.story) base.story = i.story;
    return base;
  });

  const filtered = ingredients.filter((ing) => {
    if (season && !isInSeason(ing, season)) return false;
    if (category && ing.category !== category) return false;
    return true;
  });

  const body: IngredientsResponse = { localeId: locale.id, ingredients: filtered };
  return Response.json(body);
});
