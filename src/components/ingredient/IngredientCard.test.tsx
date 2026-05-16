import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { IngredientCard } from './IngredientCard';

import type { Ingredient } from '@/domain/ingredient';

const SERI: Ingredient = {
  id: 'miyagi-seri',
  localeId: 'miyagi',
  name: 'せり',
  category: 'vegetable',
  seasons: ['winter', 'spring'],
  story: '一関の山あいで掘り起こされる',
};

describe('IngredientCard', () => {
  it('renders the ingredient name and story', () => {
    render(<IngredientCard ingredient={SERI} selected={false} onToggle={() => undefined} />);
    expect(screen.getByRole('heading', { name: 'せり' })).toBeInTheDocument();
    expect(screen.getByText(/一関の山あい/)).toBeInTheDocument();
  });

  it('displays one badge per season', () => {
    render(<IngredientCard ingredient={SERI} selected={false} onToggle={() => undefined} />);
    expect(screen.getByText('冬')).toBeInTheDocument();
    expect(screen.getByText('春')).toBeInTheDocument();
  });

  it('aria-pressed reflects selected', () => {
    const { rerender } = render(
      <IngredientCard ingredient={SERI} selected={false} onToggle={() => undefined} />,
    );
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-pressed', 'false');

    rerender(<IngredientCard ingredient={SERI} selected onToggle={() => undefined} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('onToggle fires with the ingredient id when clicked', async () => {
    const onToggle = vi.fn();
    render(<IngredientCard ingredient={SERI} selected={false} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledWith('miyagi-seri');
  });

  it('selected state renders with adjusted aria-label', () => {
    render(<IngredientCard ingredient={SERI} selected onToggle={() => undefined} />);
    expect(screen.getByLabelText(/せり.*選択中/)).toBeInTheDocument();
  });

  it('omits the story paragraph when ingredient.story is missing', () => {
    const { story: _story, ...withoutStory } = SERI;
    void _story;
    const { container } = render(
      <IngredientCard ingredient={withoutStory} selected={false} onToggle={() => undefined} />,
    );
    // story が無いとき paragraph が無いことを確認
    expect(container.querySelectorAll('p').length).toBe(0);
  });
});
