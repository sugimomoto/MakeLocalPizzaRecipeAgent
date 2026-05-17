import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { GoogleButton } from './GoogleButton';

describe('GoogleButton', () => {
  it('renders with the default Japanese label', () => {
    render(<GoogleButton />);
    expect(screen.getByRole('button', { name: 'Google で続ける' })).toBeInTheDocument();
  });

  it('accepts a custom label', () => {
    render(<GoogleButton label="サインインする" />);
    expect(screen.getByRole('button', { name: 'サインインする' })).toBeInTheDocument();
  });

  it('defaults to type=button to avoid accidental form submission', () => {
    render(<GoogleButton />);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('forwards onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<GoogleButton onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('honors disabled state', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<GoogleButton onClick={onClick} disabled />);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders the 4-color Google G mark as aria-hidden SVG', () => {
    const { container } = render(<GoogleButton />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('aria-hidden')).not.toBeNull();
  });
});
