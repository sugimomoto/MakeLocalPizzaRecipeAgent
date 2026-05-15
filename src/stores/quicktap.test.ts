import { beforeEach, describe, expect, it } from 'vitest';

import { useQuickTapStore } from './quicktap';

describe('useQuickTapStore', () => {
  beforeEach(() => {
    useQuickTapStore.getState().clear();
  });

  it('starts with an empty selection', () => {
    expect(useQuickTapStore.getState().selectedIngredients).toEqual([]);
  });

  it('toggle() adds an unseen id', () => {
    useQuickTapStore.getState().toggle('miyagi-seri');
    expect(useQuickTapStore.getState().selectedIngredients).toEqual(['miyagi-seri']);
  });

  it('toggle() removes an existing id', () => {
    const { toggle } = useQuickTapStore.getState();
    toggle('miyagi-seri');
    toggle('miyagi-seri');
    expect(useQuickTapStore.getState().selectedIngredients).toEqual([]);
  });

  it('toggle() preserves insertion order across multiple ids', () => {
    const { toggle } = useQuickTapStore.getState();
    toggle('a');
    toggle('b');
    toggle('c');
    expect(useQuickTapStore.getState().selectedIngredients).toEqual(['a', 'b', 'c']);
    toggle('b');
    expect(useQuickTapStore.getState().selectedIngredients).toEqual(['a', 'c']);
  });

  it('set() replaces the whole selection (defensive copy)', () => {
    const ids = ['x', 'y'];
    useQuickTapStore.getState().set(ids);
    expect(useQuickTapStore.getState().selectedIngredients).toEqual(['x', 'y']);
    // 元の配列を mutate しても store には影響しない
    ids.push('z');
    expect(useQuickTapStore.getState().selectedIngredients).toEqual(['x', 'y']);
  });

  it('clear() empties the selection', () => {
    useQuickTapStore.getState().toggle('a');
    useQuickTapStore.getState().toggle('b');
    useQuickTapStore.getState().clear();
    expect(useQuickTapStore.getState().selectedIngredients).toEqual([]);
  });
});
