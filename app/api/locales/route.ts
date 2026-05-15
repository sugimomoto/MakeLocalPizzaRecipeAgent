/**
 * GET /api/locales — 都道府県一覧。
 *
 * src/data/ingredients.generated.json から locales を読み出して、
 * ingredients を除いた軽量な配列を返す (地元選択画面用)。
 */

import generatedData from '@/data/ingredients.generated.json';
import { withAuthOptional } from '@/lib/http/with-auth';

import type { Locale, Region } from '@/domain/locale';

type LocalesResponse = {
  locales: Locale[];
};

export const dynamic = 'force-static';

export const GET = withAuthOptional(async () => {
  const locales: Locale[] = generatedData.locales.map((l) => {
    const base: Locale = {
      id: l.id,
      prefecture: l.prefecture,
      prefectureCode: l.prefectureCode,
      // generated.json は scripts/ で Zod 検証済み — Region 型に narrowing
      region: l.region as Region,
    };
    if (l.cities && l.cities.length > 0) {
      base.cities = l.cities;
    }
    return base;
  });
  const body: LocalesResponse = { locales };
  return Response.json(body);
});
