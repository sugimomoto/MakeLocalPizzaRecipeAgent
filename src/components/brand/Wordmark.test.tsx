import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Wordmark } from './Wordmark';

describe('Wordmark', () => {
  it('horizontal: 「ふるさとピザ帳」と FURUSATO PIZZA-CHŌ を出す', () => {
    const { container } = render(<Wordmark kind="horizontal" />);
    expect(container.textContent).toContain('ふるさとピザ帳');
    expect(container.textContent).toContain('FURUSATO PIZZA-CHŌ');
  });

  it('stacked: 同じ 2 つのテキストを出す', () => {
    const { container } = render(<Wordmark kind="stacked" />);
    expect(container.textContent).toContain('ふるさとピザ帳');
    expect(container.textContent).toContain('FURUSATO PIZZA-CHŌ');
  });

  it('vertical: writing-mode: vertical-rl を持つ', () => {
    const { container } = render(<Wordmark kind="vertical" />);
    const outer = container.firstElementChild as HTMLElement | null;
    expect(outer?.style.writingMode).toBe('vertical-rl');
    expect(container.textContent).toContain('ふるさとピザ帳');
    expect(container.textContent).toContain('FURUSATO');
  });

  it('dark トグルで文字色が反転 (kinari)', () => {
    const { container } = render(<Wordmark kind="horizontal" dark />);
    // ふるさとピザ帳 部分の span color が kinari (FBF7ED) になる
    const spans = container.querySelectorAll('span');
    const inkSpan = Array.from(spans).find((s) => s.textContent === 'ふるさとピザ帳');
    expect(inkSpan?.style.color).toBe('rgb(251, 247, 237)');
  });

  it('size スケール時に fontSize が比例する (horizontal)', () => {
    const { container } = render(<Wordmark kind="horizontal" size={2} />);
    const spans = container.querySelectorAll('span');
    const inkSpan = Array.from(spans).find((s) => s.textContent === 'ふるさとピザ帳');
    expect(inkSpan?.style.fontSize).toBe('40px'); // 20 * 2
  });
});
