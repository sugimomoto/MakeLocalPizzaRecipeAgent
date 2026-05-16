import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Chip } from './Chip';

describe('Chip', () => {
  it('renders children text', () => {
    render(<Chip>春</Chip>);
    expect(screen.getByRole('button', { name: '春' })).toBeInTheDocument();
  });

  it('aria-pressed reflects selected', () => {
    const { rerender } = render(<Chip>x</Chip>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    rerender(<Chip selected>x</Chip>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('selected applies the selected class', () => {
    render(<Chip selected>x</Chip>);
    expect(screen.getByRole('button').className).toMatch(/selected/);
  });

  it.each(['default', 'shu', 'matcha', 'yamabuki', 'ai', 'ghost'] as const)(
    'tone-%s applies the matching class',
    (tone) => {
      render(<Chip tone={tone}>x</Chip>);
      expect(screen.getByRole('button').className).toMatch(new RegExp(`tone-${tone}`));
    },
  );

  it('forwards onClick', async () => {
    const onClick = vi.fn();
    render(<Chip onClick={onClick}>tap</Chip>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders the optional leading icon', () => {
    render(<Chip icon={<span data-testid="ic">★</span>}>x</Chip>);
    expect(screen.getByTestId('ic')).toBeInTheDocument();
  });
});
