import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PrefectureGrid } from './PrefectureGrid';
import { RegionChip } from './RegionChip';

import type { Locale } from '@/domain/locale';

const LOCALES: Locale[] = [
  { id: 'miyagi', prefecture: '宮城県', prefectureCode: 'JP-04', region: 'tohoku' },
  { id: 'nagano', prefecture: '長野県', prefectureCode: 'JP-20', region: 'chubu' },
  { id: 'kochi', prefecture: '高知県', prefectureCode: 'JP-39', region: 'shikoku' },
];

describe('RegionChip', () => {
  it('renders the Japanese region label', () => {
    render(<RegionChip region="tohoku" active={false} onClick={() => undefined} />);
    expect(screen.getByRole('button', { name: '東北' })).toBeInTheDocument();
  });

  it('shows "すべて" when region is null', () => {
    render(<RegionChip region={null} active={false} onClick={() => undefined} />);
    expect(screen.getByRole('button', { name: 'すべて' })).toBeInTheDocument();
  });

  it('aria-pressed reflects active', () => {
    render(<RegionChip region="kanto" active onClick={() => undefined} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('onClick fires with the region (or null)', async () => {
    const onClick = vi.fn();
    render(<RegionChip region="kanto" active={false} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledWith('kanto');
  });
});

describe('PrefectureGrid', () => {
  it('groups locales by region and renders each prefecture as a button', () => {
    render(
      <PrefectureGrid locales={LOCALES} selectedLocaleId={null} onSelectLocale={() => undefined} />,
    );
    expect(screen.getByRole('button', { name: '宮城県' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '長野県' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '高知県' })).toBeInTheDocument();
  });

  it('renders a section only for regions that contain at least one locale', () => {
    render(
      <PrefectureGrid locales={LOCALES} selectedLocaleId={null} onSelectLocale={() => undefined} />,
    );
    // データがある 3 region のみ表示
    expect(screen.getByText('東北')).toBeInTheDocument();
    expect(screen.getByText('中部')).toBeInTheDocument();
    expect(screen.getByText('四国')).toBeInTheDocument();
    expect(screen.queryByText('北海道')).toBeNull();
    expect(screen.queryByText('(対応データなし)')).toBeNull();
  });

  it('with a regionFilter set, shows the empty placeholder when no locales match', () => {
    render(
      <PrefectureGrid
        locales={LOCALES}
        selectedLocaleId={null}
        onSelectLocale={() => undefined}
        regionFilter="hokkaido"
        onChangeRegionFilter={() => undefined}
      />,
    );
    // フィルタチップと section heading で 2 つの 北海道 が出る (両方期待値)
    expect(screen.getAllByText('北海道').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('(対応データなし)')).toBeInTheDocument();
  });

  it('selectedLocaleId marks the matching tile aria-pressed=true', () => {
    render(
      <PrefectureGrid
        locales={LOCALES}
        selectedLocaleId="nagano"
        onSelectLocale={() => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: '長野県' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '宮城県' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking a tile fires onSelectLocale with the locale id', async () => {
    const onSelectLocale = vi.fn();
    render(
      <PrefectureGrid locales={LOCALES} selectedLocaleId={null} onSelectLocale={onSelectLocale} />,
    );
    await userEvent.click(screen.getByRole('button', { name: '高知県' }));
    expect(onSelectLocale).toHaveBeenCalledWith('kochi');
  });

  it('regionFilter narrows the visible regions', () => {
    render(
      <PrefectureGrid
        locales={LOCALES}
        selectedLocaleId={null}
        onSelectLocale={() => undefined}
        regionFilter="tohoku"
        onChangeRegionFilter={() => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: '宮城県' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '長野県' })).toBeNull();
    expect(screen.queryByRole('button', { name: '高知県' })).toBeNull();
  });

  it('renders RegionChip filter row only when onChangeRegionFilter is provided', () => {
    const { rerender } = render(
      <PrefectureGrid locales={LOCALES} selectedLocaleId={null} onSelectLocale={() => undefined} />,
    );
    expect(screen.queryByRole('group', { name: '地域フィルタ' })).toBeNull();

    rerender(
      <PrefectureGrid
        locales={LOCALES}
        selectedLocaleId={null}
        onSelectLocale={() => undefined}
        onChangeRegionFilter={() => undefined}
      />,
    );
    expect(screen.getByRole('group', { name: '地域フィルタ' })).toBeInTheDocument();
  });
});
