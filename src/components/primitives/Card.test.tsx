import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Card } from './Card';

describe('Card', () => {
  it('renders as a div by default', () => {
    render(<Card data-testid="c">hello</Card>);
    const c = screen.getByTestId('c');
    expect(c.tagName.toLowerCase()).toBe('div');
    expect(c.textContent).toBe('hello');
  });

  it('renders as a button when asButton is set', async () => {
    const onClick = vi.fn();
    render(
      <Card asButton onClick={onClick}>
        click me
      </Card>,
    );
    const btn = screen.getByRole('button', { name: 'click me' });
    expect(btn.tagName.toLowerCase()).toBe('button');
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies padding class', () => {
    render(
      <Card padding="lg" data-testid="c">
        x
      </Card>,
    );
    expect(screen.getByTestId('c').className).toMatch(/padding-lg/);
  });

  it('elevated adds the elevated class', () => {
    render(
      <Card elevated data-testid="c">
        x
      </Card>,
    );
    expect(screen.getByTestId('c').className).toMatch(/elevated/);
  });

  it('interactive class added only when asButton', () => {
    const { rerender } = render(<Card data-testid="c">x</Card>);
    expect(screen.getByTestId('c').className).not.toMatch(/interactive/);
    rerender(
      <Card asButton onClick={() => undefined}>
        x
      </Card>,
    );
    expect(screen.getByRole('button').className).toMatch(/interactive/);
  });
});
