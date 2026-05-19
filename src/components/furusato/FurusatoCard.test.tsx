import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FurusatoCard } from './FurusatoCard';

import type { FurusatoItem } from '@/domain/furusato';

function makeItem(overrides: Partial<FurusatoItem> = {}): FurusatoItem {
  return {
    itemId: 'shop:1',
    ingredientId: 'miyagi-oyster',
    platform: 'rakuten',
    title: '【ふるさと納税】宮城県松島町 三陸産生牡蠣 1kg 殻付き',
    municipality: '宮城県松島町',
    producer: '松島漁業協同組合',
    donationAmount: 12000,
    url: 'https://item.rakuten.co.jp/shop/abc/',
    affiliateUrl: 'https://hb.afl.rakuten.co.jp/aff',
    imageUrl: 'https://thumb.example.com/x.jpg',
    inStock: true,
    fetchedAt: '2026-05-19T00:00:00.000Z',
    ...overrides,
  };
}

describe('FurusatoCard', () => {
  it('renders title, municipality, producer, formatted donation amount', () => {
    render(<FurusatoCard item={makeItem()} />);
    expect(screen.getByText(/三陸産生牡蠣/)).toBeInTheDocument();
    expect(screen.getByText('宮城県松島町')).toBeInTheDocument();
    expect(screen.getByText('松島漁業協同組合')).toBeInTheDocument();
    expect(screen.getByText('12,000')).toBeInTheDocument();
    expect(screen.getByText('円〜')).toBeInTheDocument();
    expect(screen.getByText('RAKUTEN')).toBeInTheDocument();
    expect(screen.getByText('取り寄せる')).toBeInTheDocument();
  });

  it('uses affiliateUrl when present, with sponsored rel', () => {
    render(<FurusatoCard item={makeItem()} />);
    const link = screen.getByRole('link', { name: /楽天で開く/ });
    expect(link.getAttribute('href')).toBe('https://hb.afl.rakuten.co.jp/aff');
    expect(link.getAttribute('rel')).toContain('sponsored');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.getAttribute('rel')).toContain('noreferrer');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('falls back to url when affiliateUrl is null', () => {
    render(<FurusatoCard item={makeItem({ affiliateUrl: null })} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('https://item.rakuten.co.jp/shop/abc/');
  });

  it('shows 在庫切れ badge and out-of-stock styling when inStock=false', () => {
    render(<FurusatoCard item={makeItem({ inStock: false })} />);
    expect(screen.getByText('在庫切れ')).toBeInTheDocument();
  });

  it('hides 在庫切れ badge when inStock=true', () => {
    render(<FurusatoCard item={makeItem({ inStock: true })} />);
    expect(screen.queryByText('在庫切れ')).not.toBeInTheDocument();
  });

  it('renders <img> when imageUrl is set, fallback emoji when not', () => {
    const { container, rerender } = render(<FurusatoCard item={makeItem()} />);
    expect(container.querySelector('img')).toBeTruthy();

    rerender(<FurusatoCard item={makeItem({ imageUrl: null })} />);
    expect(container.querySelector('img')).toBeNull();
  });

  it('hides producer when null', () => {
    render(<FurusatoCard item={makeItem({ producer: null })} />);
    expect(screen.queryByText('松島漁業協同組合')).not.toBeInTheDocument();
  });

  it('hides municipality when empty', () => {
    render(<FurusatoCard item={makeItem({ municipality: '' })} />);
    expect(screen.queryByText('宮城県松島町')).not.toBeInTheDocument();
  });
});
