import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PizzaDisk } from './PizzaDisk';

describe('PizzaDisk', () => {
  it('renders an SVG with role=img and the supplied label', () => {
    const { getByRole } = render(<PizzaDisk seed={1} label="王道ピザ" />);
    const svg = getByRole('img', { name: '王道ピザ' });
    expect(svg.tagName.toLowerCase()).toBe('svg');
  });

  it('falls back to a default aria-label when no label is given', () => {
    const { getByRole } = render(<PizzaDisk seed={2} />);
    expect(getByRole('img', { name: 'pizza illustration' })).toBeInTheDocument();
  });

  it('respects the size prop', () => {
    const { getByRole } = render(<PizzaDisk size={400} seed={3} />);
    const svg = getByRole('img');
    expect(svg.getAttribute('width')).toBe('400');
    expect(svg.getAttribute('height')).toBe('400');
    expect(svg.getAttribute('viewBox')).toBe('0 0 400 400');
  });

  it('renders one circle per spot topping count', () => {
    const { getByRole } = render(
      <PizzaDisk seed={10} toppings={[{ color: '#000', count: 7, type: 'spot' }]} />,
    );
    const svg = getByRole('img');
    // 1 (outer shadow) + 1 (crust) + 30 (speckles) + 1 (sauce) + 14 (cheese) + 7 (toppings) = 54
    expect(svg.querySelectorAll('circle').length).toBe(54);
  });

  it('is deterministic for the same (seed, toppings)', () => {
    const toppings = [{ color: '#aaa', count: 5 }];
    const r1 = render(<PizzaDisk seed={42} toppings={toppings} />);
    const a = r1.container.querySelector('svg')!.outerHTML;
    r1.unmount();
    const r2 = render(<PizzaDisk seed={42} toppings={toppings} />);
    const b = r2.container.querySelector('svg')!.outerHTML;
    expect(a).toBe(b);
  });

  it('produces different output for different seeds', () => {
    const toppings = [{ color: '#aaa', count: 5 }];
    const r1 = render(<PizzaDisk seed={1} toppings={toppings} />);
    const a = r1.container.querySelector('svg')!.outerHTML;
    r1.unmount();
    const r2 = render(<PizzaDisk seed={2} toppings={toppings} />);
    const b = r2.container.querySelector('svg')!.outerHTML;
    expect(a).not.toBe(b);
  });
});
