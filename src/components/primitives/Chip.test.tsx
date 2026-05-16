import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Chip } from './Chip';

describe('Chip (display mode, no onClick)', () => {
  it('renders as a span when no onClick is provided', () => {
    render(<Chip>春</Chip>);
    const el = screen.getByText('春');
    expect(el.tagName.toLowerCase()).toBe('span');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it.each(['default', 'shu', 'matcha', 'yamabuki', 'ai', 'ghost'] as const)(
    'tone-%s applies the matching class',
    (tone) => {
      render(<Chip tone={tone}>x</Chip>);
      expect(screen.getByText('x').className).toMatch(new RegExp(`tone-${tone}`));
    },
  );

  it('renders the optional leading icon', () => {
    render(<Chip icon={<span data-testid="ic">★</span>}>x</Chip>);
    expect(screen.getByTestId('ic')).toBeInTheDocument();
  });
});

describe('Chip (interactive mode, onClick provided)', () => {
  it('renders as a button when onClick is provided', () => {
    render(<Chip onClick={() => undefined}>春</Chip>);
    expect(screen.getByRole('button', { name: '春' })).toBeInTheDocument();
  });

  it('aria-pressed reflects selected', () => {
    const noop = () => undefined;
    const { rerender } = render(<Chip onClick={noop}>x</Chip>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    rerender(
      <Chip onClick={noop} selected>
        x
      </Chip>,
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('selected applies the selected class', () => {
    render(
      <Chip onClick={() => undefined} selected>
        x
      </Chip>,
    );
    expect(screen.getByRole('button').className).toMatch(/selected/);
  });

  it('forwards onClick', async () => {
    const onClick = vi.fn();
    render(<Chip onClick={onClick}>tap</Chip>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
