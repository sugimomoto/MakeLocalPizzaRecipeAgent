import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readOvenProfile } from '@/lib/localstorage/oven-profile';

import { OvenProfileSelector } from './OvenProfileSelector';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const toastPushMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ push: toastPushMock, dismiss: vi.fn() }),
}));

describe('OvenProfileSelector', () => {
  beforeEach(() => {
    window.localStorage.clear();
    toastPushMock.mockReset();
  });

  it('初期描画は ENRO ピル (デフォルト・推奨)', () => {
    render(<OvenProfileSelector />);
    const pill = screen.getByRole('button', { name: /機材プロファイル: ENRO 電気ピザ窯/ });
    expect(pill).toBeTruthy();
    expect(pill.textContent).toContain('ENRO');
  });

  it('localStorage に home が永続化されていれば家庭用オーブンピルを表示', async () => {
    window.localStorage.setItem(
      'mlpr.ovenProfile.v1',
      JSON.stringify({ id: 'home_oven_280c_10m', selectedAt: 1 }),
    );
    render(<OvenProfileSelector />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /機材プロファイル: 家庭用オーブン/ })).toBeTruthy();
    });
  });

  it('ピルをクリックするとシートが開く', async () => {
    const user = userEvent.setup();
    render(<OvenProfileSelector />);
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: /機材プロファイル:/ }));
    expect(screen.getByRole('dialog', { name: '機材プロファイルを選ぶ' })).toBeTruthy();
  });

  it('シートで別オプションを選び確定すると localStorage が更新され Toast が出る', async () => {
    const user = userEvent.setup();
    render(<OvenProfileSelector />);
    await user.click(screen.getByRole('button', { name: /機材プロファイル:/ }));

    // 家庭用オーブンに切替
    const radios = screen.getAllByRole('radio');
    await user.click(radios[1]!);
    await user.click(screen.getByRole('button', { name: /この機材で続ける/ }));

    await waitFor(() => {
      expect(readOvenProfile()?.id).toBe('home_oven_280c_10m');
    });
    expect(toastPushMock).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
  });

  it('同じプロファイルを選んで確定しても Toast は出ない', async () => {
    const user = userEvent.setup();
    render(<OvenProfileSelector />);
    await user.click(screen.getByRole('button', { name: /機材プロファイル:/ }));
    // ENRO のまま確定
    await user.click(screen.getByRole('button', { name: /この機材で続ける/ }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(toastPushMock).not.toHaveBeenCalled();
  });

  it('シート × ボタンで閉じる (確定しない)', async () => {
    const user = userEvent.setup();
    render(<OvenProfileSelector />);
    await user.click(screen.getByRole('button', { name: /機材プロファイル:/ }));
    await user.click(screen.getByRole('button', { name: '閉じる' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(toastPushMock).not.toHaveBeenCalled();
    expect(readOvenProfile()).toBeNull();
  });
});
