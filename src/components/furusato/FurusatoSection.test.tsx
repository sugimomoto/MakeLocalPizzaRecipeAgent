/**
 * FurusatoSection のテスト。
 *
 * useFurusatoItems を mock して 4 状態 (disabled / loading / ready 空 / ready N 件 / error)
 * のレンダリングを verify する。
 */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FurusatoSection } from './FurusatoSection';

import type { FurusatoItem } from '@/domain/furusato';

const useFurusatoItemsMock = vi.fn();
vi.mock('@/hooks/use-furusato-items', () => ({
  useFurusatoItems: (...args: unknown[]) => useFurusatoItemsMock(...args),
}));

function makeItem(itemId: string, donation: number): FurusatoItem {
  return {
    itemId,
    ingredientId: 'miyagi-oyster',
    platform: 'rakuten',
    title: `【ふるさと納税】test ${itemId}`,
    municipality: '宮城県',
    producer: null,
    donationAmount: donation,
    url: 'https://item.rakuten.co.jp/x',
    affiliateUrl: null,
    imageUrl: null,
    inStock: true,
    fetchedAt: '2026-05-19T00:00:00.000Z',
  };
}

beforeEach(() => {
  useFurusatoItemsMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FurusatoSection', () => {
  it('renders nothing when state is disabled', () => {
    useFurusatoItemsMock.mockReturnValue({ state: 'disabled', items: [], error: null });
    const { container } = render(<FurusatoSection ingredientIds={['x']} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when ready and no items (案 X: empty section hidden)', () => {
    useFurusatoItemsMock.mockReturnValue({ state: 'ready', items: [], error: null });
    const { container } = render(<FurusatoSection ingredientIds={['x']} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders header + 2 skeletons when state is loading', () => {
    useFurusatoItemsMock.mockReturnValue({ state: 'loading', items: [], error: null });
    render(<FurusatoSection ingredientIds={['x']} />);
    expect(screen.getByText('取 寄')).toBeInTheDocument();
    expect(screen.getByText('FURUSATO')).toBeInTheDocument();
    expect(screen.getAllByRole('status', { name: /読み込み中/ })).toHaveLength(2);
  });

  it('renders cards + credit when ready with items', () => {
    useFurusatoItemsMock.mockReturnValue({
      state: 'ready',
      items: [makeItem('a', 12000), makeItem('b', 8000)],
      error: null,
    });
    render(<FurusatoSection ingredientIds={['x']} />);
    expect(screen.getByText('取 寄')).toBeInTheDocument();
    expect(
      screen.getByText('このレシピの食材は、ふるさと納税の返礼品としても入手できます。'),
    ).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(screen.getByText('POWERED BY 楽天ウェブサービス')).toBeInTheDocument();
  });

  it('renders error message when error is set (even if items empty)', () => {
    useFurusatoItemsMock.mockReturnValue({
      state: 'ready',
      items: [],
      error: new Error('permission-denied'),
    });
    render(<FurusatoSection ingredientIds={['x']} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/接続できませんでした/);
    // クレジットも残る (失敗してもセクションは表示)
    expect(screen.getByText('POWERED BY 楽天ウェブサービス')).toBeInTheDocument();
  });
});
