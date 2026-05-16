import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './Button';

describe('Button', () => {
  it('renders children as button text', () => {
    render(<Button>送信</Button>);
    expect(screen.getByRole('button', { name: '送信' })).toBeInTheDocument();
  });

  it('defaults to type=button to avoid accidental form submission', () => {
    render(<Button>x</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('forwards onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>tap</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disabled prevents click', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        x
      </Button>,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it.each(['shu', 'yamabuki', 'ai', 'ghost'] as const)(
    'applies variant class for %s',
    (variant) => {
      render(<Button variant={variant}>x</Button>);
      const btn = screen.getByRole('button');
      expect(btn.className).toMatch(new RegExp(`variant-${variant}`));
    },
  );

  it('renders leading and trailing icons', () => {
    render(
      <Button
        leadingIcon={<span data-testid="lead">←</span>}
        trailingIcon={<span data-testid="trail">→</span>}
      >
        label
      </Button>,
    );
    expect(screen.getByTestId('lead')).toBeInTheDocument();
    expect(screen.getByTestId('trail')).toBeInTheDocument();
  });
});
