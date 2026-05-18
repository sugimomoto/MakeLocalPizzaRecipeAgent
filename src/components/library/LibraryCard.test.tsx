import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LibraryCard } from './LibraryCard';

import type { SavedRecipe } from '@/domain/saved-recipe';

function buildRecipe(overrides: Partial<SavedRecipe> = {}): SavedRecipe {
  return {
    candidateId: 'cand-1',
    title: '松島牡蠣と仙台せりの春一枚',
    localeId: 'miyagi',
    prefecture: '宮城県',
    strategy: 'exploit',
    imageUrl: '',
    savedAt: new Date('2026-05-17T10:00:00Z'),
    ...overrides,
  };
}

describe('LibraryCard', () => {
  it('renders title, strategy label, prefecture, formatted date', () => {
    render(<LibraryCard recipe={buildRecipe()} onSelect={() => {}} />);
    expect(screen.getByText('松島牡蠣と仙台せりの春一枚')).toBeInTheDocument();
    expect(screen.getByText('王道')).toBeInTheDocument();
    expect(screen.getByText('宮城県')).toBeInTheDocument();
    expect(screen.getByText('2026.05.17')).toBeInTheDocument();
  });

  it('calls onSelect when the card is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<LibraryCard recipe={buildRecipe()} onSelect={onSelect} />);
    await user.click(screen.getByRole('button', { name: /を開く/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('shows the heart and calls onUnsave on heart click (not onSelect)', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onUnsave = vi.fn();
    render(<LibraryCard recipe={buildRecipe()} onSelect={onSelect} onUnsave={onUnsave} />);
    await user.click(screen.getByRole('button', { name: /の保存を解除/ }));
    expect(onUnsave).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('does not render the heart when onUnsave is omitted', () => {
    render(<LibraryCard recipe={buildRecipe()} onSelect={() => {}} />);
    expect(screen.queryByRole('button', { name: /の保存を解除/ })).not.toBeInTheDocument();
  });

  it('renders <img> when imageUrl is set, fallback when not', () => {
    const { container, rerender } = render(
      <LibraryCard recipe={buildRecipe({ imageUrl: '' })} onSelect={() => {}} />,
    );
    expect(container.querySelector('img')).toBeNull();

    rerender(
      <LibraryCard
        recipe={buildRecipe({ imageUrl: 'https://example.com/pizza.png' })}
        onSelect={() => {}}
      />,
    );
    expect(container.querySelector('img')).toBeTruthy();
  });

  it('uses 戦略 label for tune and explore', () => {
    const { rerender } = render(
      <LibraryCard recipe={buildRecipe({ strategy: 'tune' })} onSelect={() => {}} />,
    );
    expect(screen.getByText('一歩外す')).toBeInTheDocument();
    rerender(<LibraryCard recipe={buildRecipe({ strategy: 'explore' })} onSelect={() => {}} />);
    expect(screen.getByText('大冒険')).toBeInTheDocument();
  });
});
