/**
 * TS ⇔ Python ストリームスキーマ契約テスト (Phase 3)。
 *
 * Python (Pydantic) 側が `agent/tests/test_stream_contract.py` で生成・コミットした
 * `__fixtures__/stream-events.generated.ndjson` を読み込み、全イベントが TS (Zod) の
 * StreamEventSchema でパースできること、かつ Zod union の型集合と fixture の型集合が
 * 完全一致することを検証する。
 *
 * これにより、片方のスキーマだけにイベント型を追加・変更した場合に CI で検出できる:
 *   - Python が型を追加 → fixture に新 type 出現 → ここでパース失敗 or 型集合不一致で RED
 *   - TS が型を追加     → Zod union にあるが fixture に無い → 型集合不一致で RED
 *
 * fixture を更新するには (Python 側):
 *   cd agent && UPDATE_FIXTURES=1 uv run --extra dev python -m pytest tests/test_stream_contract.py
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  CandidateStreamEventSchema,
  RecipeDetailStreamEventSchema,
  StreamEventSchema,
} from './schemas';

const FIXTURE_PATH = join(import.meta.dirname, '__fixtures__', 'stream-events.generated.ndjson');

function loadFixtureLines(): unknown[] {
  const raw = readFileSync(FIXTURE_PATH, 'utf-8');
  return raw
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

/** discriminatedUnion の各メンバーから type リテラル値を取り出す。 */
function unionTypeLiterals(schema: z.ZodDiscriminatedUnion): Set<string> {
  const types = new Set<string>();
  for (const option of schema.options) {
    const typeSchema = (option as z.ZodObject).shape.type as z.ZodLiteral<string>;
    types.add(typeSchema.value);
  }
  return types;
}

describe('stream schema contract (TS ⇔ Python)', () => {
  const events = loadFixtureLines();

  it('parses every Python-generated event with StreamEventSchema', () => {
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      const result = StreamEventSchema.safeParse(event);
      if (!result.success) {
        throw new Error(
          `fixture イベントが StreamEventSchema でパースできません: ` +
            `${JSON.stringify(event)}\n${result.error.message}`,
        );
      }
    }
  });

  it('covers exactly the same type literals as the Zod union (no drift)', () => {
    const fixtureTypes = new Set(
      events.map((e) => (e as { type: string }).type),
    );
    const schemaTypes = unionTypeLiterals(StreamEventSchema);

    const missingInFixture = [...schemaTypes].filter((t) => !fixtureTypes.has(t));
    const missingInSchema = [...fixtureTypes].filter((t) => !schemaTypes.has(t));

    expect(missingInFixture, `Zod union にあるが fixture に無い型 (Python 側を再生成?)`).toEqual([]);
    expect(missingInSchema, `fixture にあるが Zod union に無い型 (TS schemas.ts を更新?)`).toEqual(
      [],
    );
  });

  it('routes candidate / recipe events to their respective sub-unions', () => {
    const candidateTypes = unionTypeLiterals(CandidateStreamEventSchema);
    const recipeTypes = unionTypeLiterals(RecipeDetailStreamEventSchema);

    for (const event of events) {
      const type = (event as { type: string }).type;
      if (candidateTypes.has(type)) {
        expect(CandidateStreamEventSchema.safeParse(event).success).toBe(true);
      }
      if (recipeTypes.has(type)) {
        expect(RecipeDetailStreamEventSchema.safeParse(event).success).toBe(true);
      }
    }
  });
});
