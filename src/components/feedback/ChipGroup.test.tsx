import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ChipGroup } from './ChipGroup';

const OPTIONS = [
  '食材の組合せ',
  'ストーリーがウケた',
  '焼き加減',
  '見た目',
  '量',
  'ワインとの相性',
];

describe('ChipGroup', () => {
  it('全 chip が button として描画される', () => {
    render(
      <ChipGroup
        jpLabel="効いた点"
        enLabel="WORKED"
        options={OPTIONS}
        value={[]}
        onChange={() => {}}
      />,
    );
    expect(screen.getAllByRole('button')).toHaveLength(OPTIONS.length);
  });

  it('value に入っている chip は aria-pressed=true', () => {
    render(
      <ChipGroup
        jpLabel="効いた点"
        enLabel="WORKED"
        options={OPTIONS}
        value={['見た目']}
        onChange={() => {}}
      />,
    );
    const btn = screen.getByRole('button', { name: '見た目' });
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('未選択 chip クリックで onChange に追加 (マスタ順保持)', async () => {
    const onChange = vi.fn();
    render(
      <ChipGroup
        jpLabel="効いた点"
        enLabel="WORKED"
        options={OPTIONS}
        value={['見た目']}
        onChange={onChange}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '食材の組合せ' }));
    // マスタ順: '食材の組合せ' → '見た目' の順
    expect(onChange).toHaveBeenCalledWith(['食材の組合せ', '見た目']);
  });

  it('選択済 chip クリックで onChange から外れる', async () => {
    const onChange = vi.fn();
    render(
      <ChipGroup
        jpLabel="効いた点"
        enLabel="WORKED"
        options={OPTIONS}
        value={['見た目', '量']}
        onChange={onChange}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '見た目' }));
    expect(onChange).toHaveBeenCalledWith(['量']);
  });

  it('上限 6 個に到達したら未選択 chip は aria-disabled=true、クリックで onCapHit', async () => {
    const onChange = vi.fn();
    const onCapHit = vi.fn();
    render(
      <ChipGroup
        jpLabel="効いた点"
        enLabel="WORKED"
        options={OPTIONS}
        value={OPTIONS.slice(0, 6)} // 6 個選択済
        onChange={onChange}
        onCapHit={onCapHit}
      />,
    );
    // OPTIONS は 6 個しかないのでもう未選択は無いが、cap 到達を強制するため別件で
    // 7 個目のオプションを足したケースを別途
    // → ここでは「選択済はトグル可能」を検証
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '見た目' }));
    expect(onChange).toHaveBeenCalled();
    expect(onCapHit).not.toHaveBeenCalled();
  });

  it('cap 到達 + 未選択チップが残るケース: aria-disabled + onCapHit', async () => {
    const opts = [...OPTIONS, '余り物']; // 7 個目を追加
    const onChange = vi.fn();
    const onCapHit = vi.fn();
    render(
      <ChipGroup
        jpLabel="効いた点"
        enLabel="WORKED"
        options={opts}
        value={OPTIONS}
        onChange={onChange}
        onCapHit={onCapHit}
      />,
    );
    const seventh = screen.getByRole('button', { name: '余り物' });
    expect(seventh.getAttribute('aria-disabled')).toBe('true');
    const user = userEvent.setup();
    await user.click(seventh);
    expect(onCapHit).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('value 0 件のとき選択数バッジを出さない', () => {
    const { container } = render(
      <ChipGroup
        jpLabel="効いた点"
        enLabel="WORKED"
        options={OPTIONS}
        value={[]}
        onChange={() => {}}
      />,
    );
    // header に含まれる数字テキストが無いことを確認 (簡易)
    expect(container.textContent).not.toMatch(/^.*\d.*$/m);
  });
});
