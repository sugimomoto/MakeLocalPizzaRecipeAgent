/**
 * scripts/build-ingredient-data.mjs の純粋関数 (parseIngredientsYaml) をテストする。
 * .mjs を vitest から直接 import して検証する形。
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  IngredientsSourceSchema,
  parseIngredientsYaml,
  // eslint-disable-next-line import/no-restricted-paths -- scripts ディレクトリは layer 制約の対象外
} from '../../../scripts/build-ingredient-data';

const PROJECT_ROOT = resolve(__dirname, '../../..');
const REAL_YAML_PATH = resolve(PROJECT_ROOT, 'agent/data/ingredients.yaml');

const VALID_MIN_YAML = `
locales:
  - id: miyagi
    prefecture: 宮城県
    prefectureCode: JP-04
    region: tohoku
    cities:
      - { id: sendai, name: 仙台市 }
    ingredients:
      - id: x
        name: テスト食材
        category: vegetable
        seasons: [spring]
`;

describe('parseIngredientsYaml — happy path', () => {
  it('parses a minimal valid YAML', () => {
    const parsed = parseIngredientsYaml(VALID_MIN_YAML);
    expect(parsed.locales).toHaveLength(1);
    expect(parsed.locales[0]?.id).toBe('miyagi');
    expect(parsed.locales[0]?.ingredients[0]?.id).toBe('x');
  });

  it('parses the real curated YAML (3 locales × 10 ingredients = 30)', async () => {
    const text = await readFile(REAL_YAML_PATH, 'utf8');
    const parsed = parseIngredientsYaml(text);
    expect(parsed.locales).toHaveLength(3);
    const total = parsed.locales.reduce((sum, l) => sum + l.ingredients.length, 0);
    expect(total).toBe(30);
    expect(parsed.locales.map((l) => l.id)).toEqual(['miyagi', 'nagano', 'kochi']);
  });

  it('every ingredient id is globally unique across locales', async () => {
    const text = await readFile(REAL_YAML_PATH, 'utf8');
    const parsed = parseIngredientsYaml(text);
    const ids = parsed.locales.flatMap((l) => l.ingredients.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every ingredient has at least one season', async () => {
    const text = await readFile(REAL_YAML_PATH, 'utf8');
    const parsed = parseIngredientsYaml(text);
    for (const locale of parsed.locales) {
      for (const ing of locale.ingredients) {
        expect(ing.seasons.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('parseIngredientsYaml — boundary / negative cases', () => {
  const baseValid = {
    locales: [
      {
        id: 'miyagi',
        prefecture: '宮城県',
        prefectureCode: 'JP-04',
        region: 'tohoku',
        ingredients: [{ id: 'x', name: 'name', category: 'vegetable', seasons: ['spring'] }],
      },
    ],
  };

  function asYaml(obj: unknown): string {
    return JSON.stringify(obj); // YAML は JSON のスーパーセットなので JSON 文字列でも有効
  }

  it('rejects empty locales array', () => {
    expect(() => parseIngredientsYaml(asYaml({ locales: [] }))).toThrow();
  });

  it('rejects an invalid prefectureCode format', () => {
    const bad = structuredClone(baseValid);
    bad.locales[0]!.prefectureCode = '04'; // JP- prefix なし
    expect(() => parseIngredientsYaml(asYaml(bad))).toThrow();
  });

  it('rejects an unknown region value', () => {
    const bad = structuredClone(baseValid);
    bad.locales[0]!.region = 'okinawa-only'; // not a valid region
    expect(() => parseIngredientsYaml(asYaml(bad))).toThrow();
  });

  it('rejects an unknown category value', () => {
    const bad = structuredClone(baseValid);
    bad.locales[0]!.ingredients[0]!.category = 'spice'; // not allowed
    expect(() => parseIngredientsYaml(asYaml(bad))).toThrow();
  });

  it('rejects ingredients with empty seasons array', () => {
    const bad = structuredClone(baseValid);
    bad.locales[0]!.ingredients[0]!.seasons = [];
    expect(() => parseIngredientsYaml(asYaml(bad))).toThrow();
  });

  it('rejects ingredients with empty name', () => {
    const bad = structuredClone(baseValid);
    bad.locales[0]!.ingredients[0]!.name = '';
    expect(() => parseIngredientsYaml(asYaml(bad))).toThrow();
  });

  it('rejects locales without ingredients', () => {
    const bad = structuredClone(baseValid);
    bad.locales[0]!.ingredients = [];
    expect(() => parseIngredientsYaml(asYaml(bad))).toThrow();
  });
});

describe('IngredientsSourceSchema export', () => {
  it('is callable as a Zod schema directly', () => {
    const result = IngredientsSourceSchema.safeParse({ locales: [] });
    expect(result.success).toBe(false);
  });
});
