import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BakingAnimation } from './BakingAnimation';

describe('BakingAnimation', () => {
  it('renders with default label "焼成中"', () => {
    render(<BakingAnimation />);
    const status = screen.getByRole('status', { name: '焼成中' });
    expect(status).toBeInTheDocument();
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('accepts a custom label', () => {
    render(<BakingAnimation label="調理中" />);
    expect(screen.getByRole('status', { name: '調理中' })).toBeInTheDocument();
  });

  it('renders a PizzaDisk illustration with the label as aria-label', () => {
    render(<BakingAnimation label="焼成中" />);
    expect(screen.getByRole('img', { name: '焼成中のピザ' })).toBeInTheDocument();
  });

  it('different seeds produce different SVG markup', () => {
    const r1 = render(<BakingAnimation seed={1} />);
    const a = r1.container.querySelector('svg')?.outerHTML ?? '';
    r1.unmount();
    const r2 = render(<BakingAnimation seed={99} />);
    const b = r2.container.querySelector('svg')?.outerHTML ?? '';
    expect(a).not.toBe(b);
  });
});
