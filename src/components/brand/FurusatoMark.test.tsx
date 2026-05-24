import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FurusatoMark } from './FurusatoMark';

describe('FurusatoMark', () => {
  it('size <= 18 では variant 未指定で A (和印) にフォールバック', () => {
    const { container } = render(<FurusatoMark size={16} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    // MarkA は中央に「ふ」を 1 つ持つ
    const text = container.querySelector('text');
    expect(text?.textContent).toBe('ふ');
    // MarkA は <ellipse> を持たない (MarkB と判別)
    expect(container.querySelector('ellipse')).toBeNull();
  });

  it('size > 18 では variant 未指定で B (円窓ピザ + 和印) を採用', () => {
    const { container } = render(<FurusatoMark size={64} />);
    // MarkB は basil leaves で <ellipse> を含む
    expect(container.querySelector('ellipse')).toBeTruthy();
    // 右下の和印「ふ」を含む
    const texts = container.querySelectorAll('text');
    expect(texts.length).toBeGreaterThan(0);
    expect(Array.from(texts).some((t) => t.textContent === 'ふ')).toBe(true);
  });

  it('variant 明示で C (帳印) は「ふるさとピザ帳」6 文字を縦組で出す', () => {
    const { container } = render(<FurusatoMark variant="C" size={120} />);
    const texts = container.querySelectorAll('text');
    const chars = Array.from(texts).map((t) => t.textContent);
    expect(chars).toEqual(expect.arrayContaining(['ふ', 'る', 'さ', 'ピ', 'ザ', '帳']));
  });

  it('variant 明示で D (一切れ印) は「ふ」と path を含む', () => {
    const { container } = render(<FurusatoMark variant="D" size={120} />);
    expect(container.querySelector('path')).toBeTruthy();
    const text = container.querySelector('text');
    expect(text?.textContent).toBe('ふ');
  });

  it('aria-label を持つ', () => {
    const { container } = render(<FurusatoMark size={64} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).toBe('ふるさとピザ帳');
    expect(svg?.getAttribute('role')).toBe('img');
  });

  it('label を上書きできる', () => {
    const { container } = render(<FurusatoMark size={32} label="Furusato Pizza" />);
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('Furusato Pizza');
  });

  it('指定 size が width/height に反映される', () => {
    const { container } = render(<FurusatoMark size={96} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('96');
    expect(svg?.getAttribute('height')).toBe('96');
  });

  it('dark トグルで A の塗りが反転 (kinari fill)', () => {
    const { container } = render(<FurusatoMark variant="A" size={32} dark />);
    const circles = container.querySelectorAll('circle');
    // 最初の大きい circle = base disc
    expect(circles[0]?.getAttribute('fill')).toBe('#FBF7ED');
  });
});
