/**
 * Candidate (ピザ候補) ドメイン型。
 *
 * - Strategy は exploit (王道) / tune (一歩外す) / explore (大冒険) の 3 軸
 * - STRATEGY_LABELS で日本語ラベルと CSS 変数 (色) を一元管理
 * - QuickTapSessionPayload は 1 セッションの最終確定形 (3 候補)
 */

import type { IngredientId } from './ingredient';
import type { LocaleId } from './locale';

export type Strategy = 'exploit' | 'tune' | 'explore';

export type StrategyLabel = {
  strategy: Strategy;
  japaneseLabel: string;
  inkColor: string;
  bgColor: string;
};

export const STRATEGIES: readonly Strategy[] = ['exploit', 'tune', 'explore'] as const;

export const STRATEGY_LABELS: Record<Strategy, StrategyLabel> = {
  exploit: {
    strategy: 'exploit',
    japaneseLabel: '王道',
    inkColor: 'var(--mlpr-exploit-ink)',
    bgColor: 'var(--mlpr-exploit-bg)',
  },
  tune: {
    strategy: 'tune',
    japaneseLabel: '一歩外す',
    inkColor: 'var(--mlpr-tune-ink)',
    bgColor: 'var(--mlpr-tune-bg)',
  },
  explore: {
    strategy: 'explore',
    japaneseLabel: '大冒険',
    inkColor: 'var(--mlpr-explore-ink)',
    bgColor: 'var(--mlpr-explore-bg)',
  },
};

export type Candidate = {
  candidateId: string;
  strategy: Strategy;
  title: string;
  concept: string;
  keyIngredients: string[];
  sceneTags: string[];
  why: string;
};

export type QuickTapSessionPayload = {
  sessionId: string;
  localeId: LocaleId;
  ingredients: IngredientId[];
  candidates: Candidate[];
};

/**
 * 候補ストリーム途中状態 (use-quicktap-stream の reducer state)。
 *
 * NDJSON events で title/concept/... が段階的に埋まる。完成時 isDone=true。
 * sessionStorage キャッシュ (stream-cache.ts) と hook の reducer の両者から
 * 参照される共通型なので domain 層に置く。
 */
export type PartialCandidate = {
  candidateId: string;
  strategy: Strategy;
  title?: string;
  concept?: string;
  keyIngredients?: string[];
  sceneTags?: string[];
  why?: string;
  isDone: boolean;
};

export function isStrategy(value: unknown): value is Strategy {
  return typeof value === 'string' && (STRATEGIES as readonly string[]).includes(value);
}
