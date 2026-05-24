import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSavedRecipesJournal } from './use-saved-recipes-journal';

import type { SavedRecipe } from '@/domain/saved-recipe';

let mocked: { state: 'loading' | 'unauthenticated' | 'ready'; items: SavedRecipe[] | null } = {
  state: 'loading',
  items: null,
};
vi.mock('./use-saved-recipes', () => ({
  useSavedRecipes: () => ({ ...mocked, error: null }),
}));

function makeRecipe(over: Partial<SavedRecipe> = {}): SavedRecipe {
  return {
    candidateId: 'c',
    title: 't',
    localeId: 'miyagi',
    prefecture: '宮城県',
    strategy: 'exploit',
    imageUrl: '',
    savedAt: new Date(),
    ...over,
  };
}

beforeEach(() => {
  mocked = { state: 'loading', items: null };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useSavedRecipesJournal', () => {
  it('state=loading のとき items=null を返す', () => {
    const { result } = renderHook(() => useSavedRecipesJournal());
    expect(result.current.state).toBe('loading');
    expect(result.current.items).toBeNull();
  });

  it('state=unauthenticated でも items=null', () => {
    mocked = { state: 'unauthenticated', items: null };
    const { result } = renderHook(() => useSavedRecipesJournal());
    expect(result.current.state).toBe('unauthenticated');
    expect(result.current.items).toBeNull();
  });

  it('全 0 件のとき items は空配列', () => {
    mocked = { state: 'ready', items: [] };
    const { result } = renderHook(() => useSavedRecipesJournal());
    expect(result.current.state).toBe('ready');
    expect(result.current.items).toEqual([]);
  });

  it('feedback あり / 無を混在させた場合、feedback あり のみ残る + cookedAt 降順', () => {
    const items: SavedRecipe[] = [
      makeRecipe({ candidateId: 'c1', title: 'no-fb' }),
      makeRecipe({
        candidateId: 'c2',
        title: 'older',
        feedback: {
          overallRating: 3,
          axes: { taste: 3, look: 3, story: 0, again: 0 },
          whatWorked: [],
          whatToTune: [],
          guestVibe: [],
          guestCount: null,
          cookedAt: new Date('2026-04-01'),
          updatedAt: new Date('2026-04-01'),
        },
      }),
      makeRecipe({
        candidateId: 'c3',
        title: 'newer',
        feedback: {
          overallRating: 5,
          axes: { taste: 5, look: 5, story: 5, again: 5 },
          whatWorked: ['見た目'],
          whatToTune: [],
          guestVibe: [],
          guestCount: 4,
          cookedAt: new Date('2026-05-13'),
          updatedAt: new Date('2026-05-13'),
        },
      }),
      makeRecipe({
        candidateId: 'c4',
        title: 'rating-0-excluded',
        feedback: {
          overallRating: 0,
          axes: { taste: 0, look: 0, story: 0, again: 0 },
          whatWorked: [],
          whatToTune: [],
          guestVibe: [],
          guestCount: null,
          cookedAt: new Date('2026-06-01'),
          updatedAt: new Date('2026-06-01'),
        },
      }),
    ];
    mocked = { state: 'ready', items };
    const { result } = renderHook(() => useSavedRecipesJournal());
    expect(result.current.items).toHaveLength(2);
    expect(result.current.items![0]!.title).toBe('newer'); // 2026-05-13
    expect(result.current.items![1]!.title).toBe('older'); // 2026-04-01
  });
});
