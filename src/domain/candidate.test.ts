import { describe, expect, it } from 'vitest';

import { isStrategy, STRATEGIES, STRATEGY_LABELS } from './candidate';

import type { Candidate, QuickTapSessionPayload, Strategy } from './candidate';

describe('Strategy', () => {
  it('exposes exactly 3 strategies in canonical order', () => {
    expect(STRATEGIES).toEqual(['exploit', 'tune', 'explore']);
  });

  it('isStrategy validates only the 3 known values', () => {
    expect(isStrategy('exploit')).toBe(true);
    expect(isStrategy('tune')).toBe(true);
    expect(isStrategy('explore')).toBe(true);
    expect(isStrategy('Exploit')).toBe(false);
    expect(isStrategy('random')).toBe(false);
    expect(isStrategy(null)).toBe(false);
  });
});

describe('STRATEGY_LABELS', () => {
  it('has an entry for every Strategy with consistent self-reference', () => {
    for (const s of STRATEGIES) {
      const label = STRATEGY_LABELS[s];
      expect(label.strategy).toBe(s);
      expect(label.japaneseLabel).toBeTruthy();
      expect(label.inkColor).toMatch(/^var\(--mlpr-/);
      expect(label.bgColor).toMatch(/^var\(--mlpr-/);
    }
  });

  it('has the expected Japanese labels', () => {
    expect(STRATEGY_LABELS.exploit.japaneseLabel).toBe('王道');
    expect(STRATEGY_LABELS.tune.japaneseLabel).toBe('一歩外す');
    expect(STRATEGY_LABELS.explore.japaneseLabel).toBe('大冒険');
  });

  it('uses the strategy-specific CSS variables for ink/bg', () => {
    expect(STRATEGY_LABELS.exploit.inkColor).toBe('var(--mlpr-exploit-ink)');
    expect(STRATEGY_LABELS.tune.bgColor).toBe('var(--mlpr-tune-bg)');
    expect(STRATEGY_LABELS.explore.inkColor).toBe('var(--mlpr-explore-ink)');
  });
});

describe('QuickTapSessionPayload', () => {
  it('accepts a fully populated 3-candidate session', () => {
    const candidate = (id: string, strategy: Strategy): Candidate => ({
      candidateId: id,
      strategy,
      title: `${strategy} title`,
      concept: 'concept line',
      keyIngredients: ['牡蠣', 'せり'],
      sceneTags: ['ワインに合う'],
      why: 'why explanation',
    });
    const payload: QuickTapSessionPayload = {
      sessionId: 'sess_xxx',
      localeId: 'miyagi',
      ingredients: ['miyagi-seri', 'miyagi-oyster'],
      candidates: [candidate('c1', 'exploit'), candidate('c2', 'tune'), candidate('c3', 'explore')],
    };
    expect(payload.candidates).toHaveLength(3);
    expect(payload.candidates.map((c) => c.strategy)).toEqual(['exploit', 'tune', 'explore']);
  });
});
