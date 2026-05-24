import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { JournalCard } from './JournalCard';

import type { Feedback } from '@/domain/feedback';
import type { SavedRecipe } from '@/domain/saved-recipe';

function makeFeedback(over: Partial<Feedback> = {}): Feedback {
  return {
    overallRating: 4,
    axes: { taste: 4, look: 3, story: 5, again: 4 },
    whatWorked: ['食材の組合せ', '見た目', 'ストーリーがウケた'],
    whatToTune: [],
    guestVibe: [],
    guestCount: 4,
    cookedAt: new Date('2026-05-13'),
    updatedAt: new Date('2026-05-13'),
    ...over,
  };
}

function makeRecipe(over: Partial<SavedRecipe> = {}): SavedRecipe {
  return {
    candidateId: 'c1',
    title: 'せりと牡蠣の春一枚',
    localeId: 'miyagi',
    prefecture: '宮城・松島',
    strategy: 'exploit',
    imageUrl: 'https://example.com/p.png',
    savedAt: new Date(),
    feedback: makeFeedback(),
    ...over,
  };
}

describe('JournalCard', () => {
  it('タイトル / 戦略バッジ / 地名 / 作った日 を出す', () => {
    render(<JournalCard recipe={makeRecipe()} onOpen={() => {}} />);
    expect(screen.getByText('せりと牡蠣の春一枚')).toBeTruthy();
    expect(screen.getByText('王道')).toBeTruthy();
    expect(screen.getByText(/宮城・松島/)).toBeTruthy();
    expect(screen.getByText(/2026\.05\.13/)).toBeTruthy();
  });

  it('総合 ★ 評価が読まれる (aria-label)', () => {
    render(<JournalCard recipe={makeRecipe()} onOpen={() => {}} />);
    expect(screen.getByLabelText('総合評価 4 / 5')).toBeTruthy();
  });

  it('効いた点タグを最大 2 つ表示', () => {
    render(<JournalCard recipe={makeRecipe()} onOpen={() => {}} maxWorkedTags={2} />);
    expect(screen.getByText('食材の組合せ')).toBeTruthy();
    // 「見た目」は axis label と worked タグの 2 箇所に出る (axis 'look' の日本語ラベルと衝突)
    expect(screen.getAllByText('見た目').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('ストーリーがウケた')).toBeNull(); // 3 つ目はカット
  });

  it('クリックで onOpen に当該レシピが渡される', async () => {
    const onOpen = vi.fn();
    const recipe = makeRecipe();
    render(<JournalCard recipe={recipe} onOpen={onOpen} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalledWith(recipe);
  });
});
