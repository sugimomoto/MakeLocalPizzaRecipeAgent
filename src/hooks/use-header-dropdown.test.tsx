import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useHeaderDropdown } from './use-header-dropdown';

describe('useHeaderDropdown', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('初期状態は閉じている', () => {
    const { result } = renderHook(() => useHeaderDropdown());
    expect(result.current.open).toBe(false);
    expect(result.current.triggerProps['aria-expanded']).toBe(false);
    expect(result.current.triggerProps['aria-haspopup']).toBe('menu');
    expect(result.current.menuProps.role).toBe('menu');
  });

  it('toggle / close で open フラグが変化する', () => {
    const { result } = renderHook(() => useHeaderDropdown());
    act(() => result.current.toggle());
    expect(result.current.open).toBe(true);

    act(() => result.current.toggle());
    expect(result.current.open).toBe(false);

    act(() => result.current.toggle());
    expect(result.current.open).toBe(true);
    act(() => result.current.close());
    expect(result.current.open).toBe(false);
  });

  it('外側 pointerdown で閉じる (trigger / menu 内は除く)', () => {
    const { result } = renderHook(() => useHeaderDropdown());
    // セット trigger ref
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    (result.current.triggerProps.ref as React.MutableRefObject<HTMLButtonElement | null>).current =
      trigger;
    const menu = document.createElement('div');
    document.body.appendChild(menu);
    (result.current.menuProps.ref as React.MutableRefObject<HTMLDivElement | null>).current = menu;

    act(() => result.current.toggle());
    expect(result.current.open).toBe(true);

    // 外側クリック
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    act(() => {
      outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
    expect(result.current.open).toBe(false);
  });

  it('Esc で閉じる', () => {
    const { result } = renderHook(() => useHeaderDropdown());
    act(() => result.current.toggle());
    expect(result.current.open).toBe(true);
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(result.current.open).toBe(false);
  });

  it('↑↓ で menuitem 巡回 (循環)', () => {
    const { result } = renderHook(() => useHeaderDropdown());
    const menu = document.createElement('div');
    const i1 = document.createElement('button');
    i1.setAttribute('role', 'menuitem');
    const i2 = document.createElement('button');
    i2.setAttribute('role', 'menuitem');
    const i3 = document.createElement('button');
    i3.setAttribute('role', 'menuitem');
    menu.append(i1, i2, i3);
    document.body.appendChild(menu);
    (result.current.menuProps.ref as React.MutableRefObject<HTMLDivElement | null>).current = menu;

    i1.focus();
    expect(document.activeElement).toBe(i1);

    act(() => {
      result.current.menuProps.onKeyDown({
        key: 'ArrowDown',
        preventDefault: () => {},
      } as unknown as React.KeyboardEvent<HTMLDivElement>);
    });
    expect(document.activeElement).toBe(i2);

    act(() => {
      result.current.menuProps.onKeyDown({
        key: 'ArrowDown',
        preventDefault: () => {},
      } as unknown as React.KeyboardEvent<HTMLDivElement>);
    });
    expect(document.activeElement).toBe(i3);

    // 末尾から循環で先頭
    act(() => {
      result.current.menuProps.onKeyDown({
        key: 'ArrowDown',
        preventDefault: () => {},
      } as unknown as React.KeyboardEvent<HTMLDivElement>);
    });
    expect(document.activeElement).toBe(i1);

    // 上に巡回
    act(() => {
      result.current.menuProps.onKeyDown({
        key: 'ArrowUp',
        preventDefault: () => {},
      } as unknown as React.KeyboardEvent<HTMLDivElement>);
    });
    expect(document.activeElement).toBe(i3);
  });
});
