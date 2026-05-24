import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { StarInput } from './StarInput';

import type { FeedbackScore } from '@/domain/feedback';

function Harness({ initial = 0 }: { initial?: FeedbackScore }): React.JSX.Element {
  const [value, setValue] = (function useState() {
    // 簡易 controlled wrapper
    let v: FeedbackScore = initial;
    return [
      v,
      (next: FeedbackScore): void => {
        v = next;
      },
    ];
  })();
  void value;
  void setValue;
  // 上記は静的だが、実際は React の useState を使う
  // (このファイルでは window.useState を直接呼ぶのは避けるため、別ラッパーを下に定義)
  return <span />;
}
void Harness;

describe('StarInput', () => {
  it('5 つの radio (★) を出す', () => {
    render(<StarInput value={0} onChange={() => {}} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(5);
  });

  it('value=3 のとき最初の 3 つ★が aria-checked=true', () => {
    render(<StarInput value={3} onChange={() => {}} />);
    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual([
      'true',
      'true',
      'true',
      'false',
      'false',
    ]);
  });

  it('★ をクリックでその位置までを点灯', async () => {
    const onChange = vi.fn();
    render(<StarInput value={0} onChange={onChange} />);
    const user = userEvent.setup();
    await user.click(screen.getAllByRole('radio')[3]!);
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('同じ★ を再タップで 0 にクリア', async () => {
    const onChange = vi.fn();
    render(<StarInput value={3} onChange={onChange} />);
    const user = userEvent.setup();
    await user.click(screen.getAllByRole('radio')[2]!);
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('キーボード: 1〜5 数字キーで設定', () => {
    const onChange = vi.fn();
    render(<StarInput value={0} onChange={onChange} />);
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: '4' });
    expect(onChange).toHaveBeenCalledWith(4);
    fireEvent.keyDown(group, { key: '1' });
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it('キーボード: 0 でクリア / ←→ で増減', () => {
    const onChange = vi.fn();
    render(<StarInput value={3} onChange={onChange} />);
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: '0' });
    expect(onChange).toHaveBeenLastCalledWith(0);
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith(4);
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it('value=5 で ArrowRight しても 5 でクランプ', () => {
    const onChange = vi.fn();
    render(<StarInput value={5} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith(5);
  });
});
