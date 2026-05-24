import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DotsInput } from './DotsInput';

describe('DotsInput', () => {
  it('aria-valuenow に value が反映される', () => {
    render(<DotsInput value={3} onChange={() => {}} label="味" />);
    const slider = screen.getByRole('slider', { name: '味' });
    expect(slider.getAttribute('aria-valuenow')).toBe('3');
    expect(slider.getAttribute('aria-valuemin')).toBe('0');
    expect(slider.getAttribute('aria-valuemax')).toBe('5');
  });

  it('ドットクリックでその位置に設定', async () => {
    const onChange = vi.fn();
    render(<DotsInput value={0} onChange={onChange} label="味" />);
    const dots = screen.getByRole('slider').querySelectorAll('button');
    const user = userEvent.setup();
    await user.click(dots[2]!); // 3 番目 = n=3
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('同じ位置を再タップで 1 段戻す', async () => {
    const onChange = vi.fn();
    render(<DotsInput value={3} onChange={onChange} label="味" />);
    const dots = screen.getByRole('slider').querySelectorAll('button');
    const user = userEvent.setup();
    await user.click(dots[2]!); // 3 → 2
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('ArrowRight で +1、ArrowLeft で -1', () => {
    const onChange = vi.fn();
    render(<DotsInput value={2} onChange={onChange} label="味" />);
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith(3);
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it('Home/End で 0/5', () => {
    const onChange = vi.fn();
    render(<DotsInput value={3} onChange={onChange} label="味" />);
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith(0);
    fireEvent.keyDown(slider, { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith(5);
  });

  it('value=0 で「未評価」とアナウンスされる', () => {
    render(<DotsInput value={0} onChange={() => {}} label="味" />);
    expect(screen.getByRole('slider').getAttribute('aria-valuetext')).toBe('未評価');
  });
});
