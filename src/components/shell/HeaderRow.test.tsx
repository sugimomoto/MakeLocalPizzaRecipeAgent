import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HeaderRow } from './HeaderRow';

const pushMock = vi.fn();
const backMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: backMock, push: pushMock, replace: vi.fn() }),
}));

describe('HeaderRow', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('title を中央に表示する', () => {
    render(<HeaderRow title="保存帳" />);
    expect(screen.getByText('保存帳')).toBeTruthy();
  });

  it('brand があれば eyebrow に表示する', () => {
    render(<HeaderRow title="保存帳" brand="ふるさとピザ帳" />);
    expect(screen.getByText('ふるさとピザ帳')).toBeTruthy();
    expect(screen.getByText('保存帳')).toBeTruthy();
  });

  it('ホームボタンを押すと onBack が呼ばれる (明示渡し)', async () => {
    const onBack = vi.fn();
    render(<HeaderRow title="食材を選ぶ" onBack={onBack} />);
    const user = userEvent.setup();
    await user.click(screen.getByLabelText('TOP に戻る'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('onBack 未指定ならホーム (/) に push する', async () => {
    render(<HeaderRow title="食材を選ぶ" />);
    const user = userEvent.setup();
    await user.click(screen.getByLabelText('TOP に戻る'));
    expect(pushMock).toHaveBeenCalledWith('/');
    expect(backMock).not.toHaveBeenCalled();
  });

  it('hideBack でホームボタンを visibility:hidden + tabIndex=-1 にする', () => {
    render(<HeaderRow title="ホーム" hideBack />);
    const btn = screen.getByLabelText('TOP に戻る');
    expect(btn.tabIndex).toBe(-1);
    expect(btn.className).toContain('backChip--hidden');
  });

  it('rightSlot に渡したノードを右に出す', () => {
    render(<HeaderRow title="保存帳" rightSlot={<span>RIGHT_SLOT</span>} />);
    expect(screen.getByText('RIGHT_SLOT')).toBeTruthy();
  });

  it('dark トグルで bar / title に dark variant が付く', () => {
    const { container } = render(<HeaderRow title="詳細レシピ" dark />);
    expect(container.querySelector('[class*="bar--dark"]')).toBeTruthy();
    expect(container.querySelector('[class*="title--dark"]')).toBeTruthy();
  });
});
