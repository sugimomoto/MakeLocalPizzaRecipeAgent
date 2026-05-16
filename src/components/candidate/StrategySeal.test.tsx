import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StrategySeal } from './StrategySeal';

describe('StrategySeal', () => {
  it.each([
    ['exploit', '王道', 'EXPLOIT'],
    ['tune', '一歩外す', 'TUNE'],
    ['explore', '大冒険', 'EXPLORE'],
  ] as const)('renders %s with the right Japanese label and English', (strategy, jp, en) => {
    render(<StrategySeal strategy={strategy} />);
    const seal = screen.getByRole('img', { name: new RegExp(`戦略: ${jp}.*${en}`) });
    expect(seal).toBeInTheDocument();
    expect(seal.textContent).toContain(jp);
    expect(seal.textContent).toContain(en);
  });

  it('respects the size prop on width and height', () => {
    render(<StrategySeal strategy="exploit" size={80} />);
    const seal = screen.getByRole('img');
    expect(seal.style.width).toBe('80px');
    expect(seal.style.height).toBe('80px');
  });
});
