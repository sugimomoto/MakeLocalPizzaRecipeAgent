import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PrefectureTile } from './PrefectureTile';

import type { Prefecture } from '@/data/prefectures';

const MIYAGI: Prefecture = {
  id: 'miyagi',
  prefecture: '宮城県',
  kanji: '宮',
  region: 'tohoku',
  note: '仙台 / 松島 / 牡鹿',
  curated: true,
};

const HOKKAIDO: Prefecture = {
  id: 'hokkaido',
  prefecture: '北海道',
  kanji: '道',
  region: 'hokkaido',
  note: '札幌 / 函館 / 知床',
  curated: false,
};

describe('PrefectureTile', () => {
  it('renders kanji, name, and note', () => {
    render(
      <PrefectureTile
        prefecture={MIYAGI}
        selected={false}
        isHome={false}
        onSelect={() => undefined}
      />,
    );
    expect(screen.getByText('宮')).toBeInTheDocument();
    expect(screen.getByText('宮城県')).toBeInTheDocument();
    expect(screen.getByText('仙台 / 松島 / 牡鹿')).toBeInTheDocument();
  });

  it('shows 原体験 badge when isHome and not selected', () => {
    render(
      <PrefectureTile prefecture={MIYAGI} selected={false} isHome onSelect={() => undefined} />,
    );
    expect(screen.getByText('原体験')).toBeInTheDocument();
  });

  it('hides 原体験 badge when selected (check badge takes precedence)', () => {
    render(<PrefectureTile prefecture={MIYAGI} selected isHome onSelect={() => undefined} />);
    expect(screen.queryByText('原体験')).toBeNull();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('shows 準備中 badge for uncurated prefecture (and no home)', () => {
    render(
      <PrefectureTile
        prefecture={HOKKAIDO}
        selected={false}
        isHome={false}
        onSelect={() => undefined}
      />,
    );
    expect(screen.getByText('準備中')).toBeInTheDocument();
  });

  it('hides 準備中 badge when uncurated but isHome', () => {
    render(
      <PrefectureTile prefecture={HOKKAIDO} selected={false} isHome onSelect={() => undefined} />,
    );
    expect(screen.queryByText('準備中')).toBeNull();
    expect(screen.getByText('原体験')).toBeInTheDocument();
  });

  it('aria-pressed reflects selected', () => {
    const { rerender } = render(
      <PrefectureTile
        prefecture={MIYAGI}
        selected={false}
        isHome={false}
        onSelect={() => undefined}
      />,
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    rerender(
      <PrefectureTile prefecture={MIYAGI} selected isHome={false} onSelect={() => undefined} />,
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('onSelect fires with prefecture id when clicked', async () => {
    const onSelect = vi.fn();
    render(
      <PrefectureTile prefecture={MIYAGI} selected={false} isHome={false} onSelect={onSelect} />,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('miyagi');
  });
});
