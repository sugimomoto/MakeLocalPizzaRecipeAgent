import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OvenProfileBadge } from './OvenProfileBadge';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe('OvenProfileBadge', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('デフォルトは ENRO プロファイルのラベル + /equipment へのリンク', async () => {
    render(<OvenProfileBadge />);
    const link = await screen.findByRole('link', { name: /機材プロファイル: ENRO 電気ピザ窯/ });
    expect(link).toHaveAttribute('href', '/equipment');
    expect(link.textContent).toContain('ENRO');
    expect(link.textContent).toContain('の前提');
  });

  it('家庭用オーブンが永続化されていればそちらを表示', async () => {
    window.localStorage.setItem(
      'mlpr.ovenProfile.v1',
      JSON.stringify({ id: 'home_oven_280c_10m', selectedAt: 1 }),
    );
    render(<OvenProfileBadge />);
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /機材プロファイル: 家庭用オーブン/ })).toBeTruthy();
    });
  });
});
