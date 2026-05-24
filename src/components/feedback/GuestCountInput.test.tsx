import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { GuestCountInput } from './GuestCountInput';

describe('GuestCountInput', () => {
  it('value=null のとき「—」を表示、− は disabled', () => {
    render(<GuestCountInput value={null} onChange={() => {}} />);
    expect(screen.getByText('—')).toBeTruthy();
    const dec = screen.getByLabelText('ゲスト数を 1 減らす') as HTMLButtonElement;
    expect(dec.disabled).toBe(true);
  });

  it('null + (+ クリック) → 1', async () => {
    const onChange = vi.fn();
    render(<GuestCountInput value={null} onChange={onChange} />);
    const user = userEvent.setup();
    await user.click(screen.getByLabelText('ゲスト数を 1 増やす'));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('value=4 + (- クリック) → 3', async () => {
    const onChange = vi.fn();
    render(<GuestCountInput value={4} onChange={onChange} />);
    const user = userEvent.setup();
    await user.click(screen.getByLabelText('ゲスト数を 1 減らす'));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('value=1 で − を押すと null に戻る', async () => {
    const onChange = vi.fn();
    render(<GuestCountInput value={1} onChange={onChange} />);
    const user = userEvent.setup();
    await user.click(screen.getByLabelText('ゲスト数を 1 減らす'));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('value=20 で + は disabled', () => {
    render(<GuestCountInput value={20} onChange={() => {}} />);
    const inc = screen.getByLabelText('ゲスト数を 1 増やす') as HTMLButtonElement;
    expect(inc.disabled).toBe(true);
  });
});
