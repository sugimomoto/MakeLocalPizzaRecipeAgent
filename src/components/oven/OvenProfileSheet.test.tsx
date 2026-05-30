import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { OvenProfileSheet } from './OvenProfileSheet';

// next/navigation の useRouter は OvenProfileSheet 内部の <Link> でも参照されない (Link は href 描画のみ) が、
// 念のため stub しておく。
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe('OvenProfileSheet', () => {
  it('open=false なら何もレンダリングしない', () => {
    const { container } = render(
      <OvenProfileSheet
        open={false}
        currentProfileId="enro_450c_90s"
        onConfirm={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('open=true で 2 ラジオオプション + 確定 CTA を表示', () => {
    render(
      <OvenProfileSheet
        open
        currentProfileId="enro_450c_90s"
        onConfirm={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(screen.getByRole('dialog', { name: '機材プロファイルを選ぶ' })).toBeTruthy();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(radios[0]).toHaveAttribute('aria-checked', 'true'); // enro
    expect(radios[1]).toHaveAttribute('aria-checked', 'false'); // home
    expect(screen.getByRole('button', { name: /この機材で続ける/ })).toBeTruthy();
  });

  it('別オプションをクリックして仮選択を変えると aria-checked が入れ替わる', async () => {
    const user = userEvent.setup();
    render(
      <OvenProfileSheet
        open
        currentProfileId="enro_450c_90s"
        onConfirm={() => undefined}
        onClose={() => undefined}
      />,
    );
    const [enroRadio, homeRadio] = screen.getAllByRole('radio');
    await user.click(homeRadio!);
    expect(enroRadio).toHaveAttribute('aria-checked', 'false');
    expect(homeRadio).toHaveAttribute('aria-checked', 'true');
  });

  it('「この機材で続ける」で onConfirm が選択中 ID で呼ばれる', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <OvenProfileSheet
        open
        currentProfileId="enro_450c_90s"
        onConfirm={onConfirm}
        onClose={() => undefined}
      />,
    );
    // home に切り替えてから確定
    const radios = screen.getAllByRole('radio');
    await user.click(radios[1]!);
    await user.click(screen.getByRole('button', { name: /この機材で続ける/ }));
    expect(onConfirm).toHaveBeenCalledWith('home_oven_280c_10m');
  });

  it('× ボタンで onClose が呼ばれる (確定はしない)', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <OvenProfileSheet
        open
        currentProfileId="enro_450c_90s"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    await user.click(screen.getByRole('button', { name: '閉じる' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('Esc キーで onClose が呼ばれる', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <OvenProfileSheet
        open
        currentProfileId="enro_450c_90s"
        onConfirm={() => undefined}
        onClose={onClose}
      />,
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('open=true → false の再 open 時に currentProfileId で draft が同期される', () => {
    const onConfirm = vi.fn();
    const { rerender } = render(
      <OvenProfileSheet
        open
        currentProfileId="enro_450c_90s"
        onConfirm={onConfirm}
        onClose={() => undefined}
      />,
    );
    // 一旦閉じる
    rerender(
      <OvenProfileSheet
        open={false}
        currentProfileId="home_oven_280c_10m"
        onConfirm={onConfirm}
        onClose={() => undefined}
      />,
    );
    // 別 ID で再 open → draft は home_oven_280c_10m になる
    rerender(
      <OvenProfileSheet
        open
        currentProfileId="home_oven_280c_10m"
        onConfirm={onConfirm}
        onClose={() => undefined}
      />,
    );
    const radios = screen.getAllByRole('radio');
    expect(radios[1]).toHaveAttribute('aria-checked', 'true');
  });
});
