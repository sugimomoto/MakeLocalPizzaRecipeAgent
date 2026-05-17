/**
 * MockAgentClient — Slice 1 用のスタブ Agent。
 *
 * - 入力 (localeId + sorted ingredients) から決定論的に 3 案を組み立てる
 * - 戦略軸ごとにテンプレート言い回しを切り替える
 *   - exploit (王道)  : 「{a} と {b} の白ピザ」
 *   - tune    (一歩外す): 「{a} に柑橘を効かせた {b} ピザ」
 *   - explore (大冒険) : 「{a} × チョコレートの意外な {b} ピザ」
 * - 各 NDJSON イベント間に 200〜400ms の遅延を入れて本番ストリームらしく演出
 * - reroll はシードを少しずらして「違う 3 案」を返す (同じ入力で連続呼び出しした際の差分が出る)
 *
 * Slice 2 で本物の Agent (HttpAgentClient) に差し替え。
 */

import { encodeNdjsonStream } from './stream';

import type { AgentClient, GenerateCandidatesInput, GenerateRecipeDetailInput } from './client';
import type { Strategy } from '@/domain/candidate';
import type { StreamEvent } from '@/domain/schemas';

const MOCK_INGREDIENT_DISPLAY: Record<string, string> = {
  'miyagi-seri': 'せり',
  'miyagi-oyster': '牡蠣',
  'nagano-shinano-sweet': '信州サーモン',
  'nagano-zuiki': 'ずいき',
  'kochi-yuzu': '柚子',
  'kochi-katsuo': '鰹',
};

const STRATEGY_ORDER: readonly Strategy[] = ['exploit', 'tune', 'explore'] as const;

const STRATEGY_TEMPLATES: Record<
  Strategy,
  {
    title: (a: string, b: string) => string;
    concept: (a: string, b: string) => string;
    sceneTags: string[];
    why: string;
  }
> = {
  exploit: {
    title: (a, b) => `${a}と${b}の白ピザ`,
    concept: (a, b) => `定番の${a}と${b}を一枚に閉じ込めた、王道の組合せ`,
    sceneTags: ['ワインに合う', '週末家族'],
    why: '過去の傾向に沿った堅実な提案',
  },
  tune: {
    title: (a, b) => `${a}と${b}の柑橘アクセント`,
    concept: (a, b) => `${a}と${b}に酸味を一手効かせて朝の表情に`,
    sceneTags: ['朝食', 'ブランチ'],
    why: '王道を一歩だけ外した、軽やかな再解釈',
  },
  explore: {
    title: (a, b) => `${a}×${b}×チョコレート`,
    concept: (a, b) => `${a}と${b}に甘苦さを重ねる、意外性追求の一枚`,
    sceneTags: ['週末の遊び', '話題作り'],
    why: '思い切って外したアイデア — 体験を広げる候補',
  },
};

function hashStringToInt(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function buildSessionId(input: GenerateCandidatesInput, salt = 0): string {
  const sortedIngredients = [...input.ingredients].sort();
  const key = `${input.localeId}|${sortedIngredients.join(',')}|${salt}`;
  const h = hashStringToInt(key).toString(16).padStart(8, '0').slice(0, 12);
  return `sess_${h}`;
}

function pickIngredientPair(input: GenerateCandidatesInput, strategy: Strategy): [string, string] {
  const sorted = [...input.ingredients].sort();
  const display = sorted.map((id) => MOCK_INGREDIENT_DISPLAY[id] ?? id);
  if (display.length === 0) return ['食材A', '食材B'];
  const idx = STRATEGY_ORDER.indexOf(strategy);
  const a = display[idx % display.length] ?? display[0]!;
  const b = display[(idx + 1) % display.length] ?? display[0]!;
  return [a, b];
}

async function delay(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function pseudoDelay(
  seed: number,
  eventIndex: number,
  range: { min: number; max: number },
): number {
  if (range.max <= 0) return 0;
  const span = Math.max(0, range.max - range.min);
  const x = Math.sin(seed + eventIndex * 17) * 10000;
  const f = x - Math.floor(x); // [0,1)
  return range.min + Math.floor(f * (span + 1));
}

export type MockAgentOptions = {
  /** イベント間の遅延範囲 (ms)。テスト時は {min:0,max:0} を渡して即時化。 */
  delayRange?: { min: number; max: number };
};

const DEFAULT_DELAY_RANGE = { min: 200, max: 400 } as const;

async function* buildEvents(
  input: GenerateCandidatesInput,
  options: { sessionId: string; delayRange: { min: number; max: number }; seed: number },
): AsyncGenerator<StreamEvent> {
  const { sessionId, delayRange, seed } = options;
  let eventIndex = 0;

  yield { type: 'session.start', sessionId, strategies: [...STRATEGY_ORDER] };

  for (let i = 0; i < STRATEGY_ORDER.length; i++) {
    const strategy = STRATEGY_ORDER[i]!;
    const candidateId = `c_${i + 1}_${sessionId.slice(-6)}`;
    const [a, b] = pickIngredientPair(input, strategy);
    const tmpl = STRATEGY_TEMPLATES[strategy];

    await delay(pseudoDelay(seed, ++eventIndex, delayRange));
    yield { type: 'candidate.start', strategy, candidateId };

    await delay(pseudoDelay(seed, ++eventIndex, delayRange));
    yield { type: 'candidate.title', candidateId, title: tmpl.title(a, b) };

    await delay(pseudoDelay(seed, ++eventIndex, delayRange));
    yield { type: 'candidate.concept', candidateId, concept: tmpl.concept(a, b) };

    await delay(pseudoDelay(seed, ++eventIndex, delayRange));
    yield {
      type: 'candidate.ingredients',
      candidateId,
      ingredients: [a, b, 'モッツァレラ'],
    };

    await delay(pseudoDelay(seed, ++eventIndex, delayRange));
    yield { type: 'candidate.sceneTags', candidateId, sceneTags: [...tmpl.sceneTags] };

    await delay(pseudoDelay(seed, ++eventIndex, delayRange));
    yield { type: 'candidate.why', candidateId, why: tmpl.why };

    await delay(pseudoDelay(seed, ++eventIndex, delayRange));
    yield { type: 'candidate.done', candidateId };
  }

  await delay(pseudoDelay(seed, ++eventIndex, delayRange));
  yield { type: 'session.done', sessionId };
}

export class MockAgentClient implements AgentClient {
  private readonly delayRange: { min: number; max: number };
  /** 同一 input に対する reroll カウンタ (sessionId をずらすため) */
  private readonly rerollCounters = new Map<string, number>();

  constructor(options: MockAgentOptions = {}) {
    this.delayRange = options.delayRange ?? { ...DEFAULT_DELAY_RANGE };
  }

  generateCandidates(input: GenerateCandidatesInput): Promise<ReadableStream<Uint8Array>> {
    const sessionId = buildSessionId(input);
    const seed = hashStringToInt(sessionId);
    return Promise.resolve(
      encodeNdjsonStream(buildEvents(input, { sessionId, delayRange: this.delayRange, seed })),
    );
  }

  reroll(sessionId: string): Promise<ReadableStream<Uint8Array>> {
    const nextSalt = (this.rerollCounters.get(sessionId) ?? 0) + 1;
    this.rerollCounters.set(sessionId, nextSalt);
    // 元の sessionId を入力扱いの salt として、新しい sessionId を発行
    const input: GenerateCandidatesInput = { localeId: sessionId, ingredients: [] };
    const newSessionId = buildSessionId(input, nextSalt);
    const seed = hashStringToInt(newSessionId);
    return Promise.resolve(
      encodeNdjsonStream(
        buildEvents(input, { sessionId: newSessionId, delayRange: this.delayRange, seed }),
      ),
    );
  }

  generateRecipeDetail(input: GenerateRecipeDetailInput): Promise<ReadableStream<Uint8Array>> {
    return Promise.resolve(
      encodeNdjsonStream(buildRecipeDetailEvents(input, { delayRange: this.delayRange })),
    );
  }
}

// ----- Slice 3: 詳細レシピ + 画像 Mock -------------------------------------

// 1x1 透明 PNG を base64 で表現 (data URI のテスト用ペイロード)
const MOCK_IMAGE_DATA_URI =
  'data:image/png;base64,' +
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

async function* buildRecipeDetailEvents(
  input: GenerateRecipeDetailInput,
  options: { delayRange: { min: number; max: number } },
): AsyncGenerator<StreamEvent> {
  const { delayRange } = options;
  const seed = hashStringToInt(input.candidateId);
  const recipeId = input.candidateId;
  let idx = 0;

  yield { type: 'recipe.start', recipeId };
  yield { type: 'image.start', recipeId };

  // テキスト系をまず流し切る (実 Agent では Gemini 一括 → 6 件)
  await delay(pseudoDelay(seed, ++idx, delayRange));
  yield { type: 'recipe.title', recipeId, title: input.candidate.title };

  await delay(pseudoDelay(seed, ++idx, delayRange));
  yield {
    type: 'recipe.meta',
    recipeId,
    meta: { servings: '4 人分', duration: '45m', bakingTemp: '270°C', difficulty: '★★☆' },
  };

  await delay(pseudoDelay(seed, ++idx, delayRange));
  yield {
    type: 'recipe.materials',
    recipeId,
    materials: [
      { name: '強力粉', quantity: '300g' },
      { name: 'モッツァレラ', quantity: '200g' },
      ...input.candidate.keyIngredients.map((k) => ({ name: k, quantity: '適量' })),
    ],
  };

  await delay(pseudoDelay(seed, ++idx, delayRange));
  yield {
    type: 'recipe.steps',
    recipeId,
    steps: [
      '生地を 30 分発酵させる',
      `${input.candidate.keyIngredients[0] ?? '主役の食材'} を下ごしらえする`,
      'チーズと一緒に乗せ、270°C で 8 分焼く',
      '仕上げに香りを足して器に移す',
    ],
  };

  await delay(pseudoDelay(seed, ++idx, delayRange));
  yield {
    type: 'recipe.story',
    recipeId,
    eyebrow: 'ゲストに語る',
    headline: `「${input.candidate.title}」`,
    body: input.candidate.why,
  };

  await delay(pseudoDelay(seed, ++idx, delayRange));
  yield { type: 'recipe.done', recipeId };

  // 画像は少し遅れて入る (実 Imagen 4 を模擬)
  await delay(pseudoDelay(seed, ++idx, { min: delayRange.min * 2, max: delayRange.max * 2 }));
  yield { type: 'image.ready', recipeId, dataUri: MOCK_IMAGE_DATA_URI };
}
