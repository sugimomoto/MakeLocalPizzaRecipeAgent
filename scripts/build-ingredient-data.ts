#!/usr/bin/env node
/**
 * agent/data/ingredients.yaml を Zod 検証 → src/data/ingredients.generated.json に出力。
 *
 * 直接実行: prebuild フック (`pnpm build`) 経由
 * 単発: `pnpm build:data`
 *
 * 検証エラー時は非 0 終了で CI を落とす。
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import yaml from 'js-yaml';
import { z } from 'zod';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

// ─────────────────────────────────────────────────────────────────────────────
// Zod スキーマ — src/domain/locale.ts / ingredient.ts と整合させる
// ─────────────────────────────────────────────────────────────────────────────
const SeasonEnum = z.enum(['spring', 'summer', 'autumn', 'winter', 'all-year']);

const CategoryEnum = z.enum(['vegetable', 'seafood', 'cheese', 'grain', 'meat', 'fruit']);

const RegionEnum = z.enum([
  'hokkaido',
  'tohoku',
  'kanto',
  'chubu',
  'kinki',
  'chugoku',
  'shikoku',
  'kyushu-okinawa',
]);

const IngredientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  searchQuery: z.string().min(1).optional(),
  category: CategoryEnum,
  seasons: z.array(SeasonEnum).min(1),
  story: z.string().min(1).optional(),
});

const CitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

const LocaleSchema = z.object({
  id: z.string().min(1),
  prefecture: z.string().min(1),
  prefectureCode: z.string().regex(/^JP-\d{2}$/),
  region: RegionEnum,
  cities: z.array(CitySchema).optional(),
  ingredients: z.array(IngredientSchema).min(1),
});

export const IngredientsSourceSchema = z.object({
  locales: z.array(LocaleSchema).min(1),
});

// ─────────────────────────────────────────────────────────────────────────────
// 公開関数
// ─────────────────────────────────────────────────────────────────────────────

export type IngredientsSource = z.infer<typeof IngredientsSourceSchema>;

/**
 * YAML テキストをパースして Zod 検証。妥当なら型付き JS オブジェクトを返す。
 * テスト・CLI 両方から呼ばれる純粋関数。
 */
export function parseIngredientsYaml(yamlText: string): IngredientsSource {
  const raw: unknown = yaml.load(yamlText);
  return IngredientsSourceSchema.parse(raw);
}

const SOURCE_PATH = resolve(PROJECT_ROOT, 'agent/data/ingredients.yaml');
const OUT_PATH = resolve(PROJECT_ROOT, 'src/data/ingredients.generated.json');

async function main() {
  const yamlText = await readFile(SOURCE_PATH, 'utf8');
  const parsed = parseIngredientsYaml(yamlText);

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');

  const totalIngredients = parsed.locales.reduce((sum, loc) => sum + loc.ingredients.length, 0);
  console.log(
    `[build-ingredient-data] wrote ${parsed.locales.length} locales / ${totalIngredients} ingredients to ${OUT_PATH}`,
  );
}

// 直接実行された時だけ main() を呼ぶ (テスト時の import では呼ばない)
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isDirectRun) {
  main().catch((err) => {
    console.error('[build-ingredient-data] failed:', err);
    process.exit(1);
  });
}
