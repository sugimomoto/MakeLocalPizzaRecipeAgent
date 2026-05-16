import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ScreenHero } from './ScreenHero';

describe('ScreenHero', () => {
  it('renders title as h1', () => {
    render(<ScreenHero title="まずは、あなたの地元を。" />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'まずは、あなたの地元を。' }),
    ).toBeInTheDocument();
  });

  it('renders ReactNode title (with <br/>)', () => {
    render(
      <ScreenHero
        title={
          <>
            まずは、
            <br />
            あなたの地元を。
          </>
        }
      />,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('まずは、あなたの地元を。');
  });

  it('renders eyebrow and sub when provided', () => {
    render(<ScreenHero eyebrow="地元 × ピザ" title="x" sub="タップでそのまま次の食材選びへ" />);
    expect(screen.getByText('地元 × ピザ')).toBeInTheDocument();
    expect(screen.getByText('タップでそのまま次の食材選びへ')).toBeInTheDocument();
  });

  it('omits eyebrow and sub when not provided', () => {
    render(<ScreenHero title="x" />);
    expect(screen.queryByText('地元 × ピザ')).toBeNull();
    // sub paragraph should not exist
    expect(document.querySelectorAll('p').length).toBe(0);
  });

  it('eyebrowTone="sumi" applies sumi color class', () => {
    render(<ScreenHero eyebrow="x" title="t" eyebrowTone="sumi" />);
    const eyebrow = screen.getByText('x');
    expect(eyebrow.className).toMatch(/sumi/);
  });
});
