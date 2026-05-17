/**
 * useToast / ToastProvider の挙動テスト:
 * 1. push で Toast が表示される
 * 2. 2.5s 経過で自動 close (auto=true)
 * 3. auto=false なら自動 close されない
 * 4. dismiss(id) で即時 close、対応 timer が clear される
 * 5. 複数 push でも互いに干渉しない
 */
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider, useToast } from './use-toast';

import type { ReactNode } from 'react';

const AUTO_CLOSE_MS = 100; // テストでは短縮

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider autoCloseMs={AUTO_CLOSE_MS}>{children}</ToastProvider>;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useToast', () => {
  it('starts with no toasts visible', () => {
    render(<ToastProvider>{null}</ToastProvider>);
    expect(screen.queryAllByRole('status')).toHaveLength(0);
  });

  it('push() displays a Toast with the given kind and message', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.push({ kind: 'success', message: '保存しました' });
    });

    expect(screen.getByRole('status')).toHaveTextContent('保存しました');
    expect(screen.getByRole('status')).toHaveTextContent('✓');
  });

  it('auto-dismisses the toast after autoCloseMs', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.push({ kind: 'info', message: 'hi' });
    });
    expect(screen.getAllByRole('status')).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(AUTO_CLOSE_MS + 10);
    });
    expect(screen.queryAllByRole('status')).toHaveLength(0);
  });

  it('does NOT auto-dismiss when auto:false (manual close only)', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.push({ kind: 'warning', message: 'stay', auto: false });
    });
    expect(screen.getAllByRole('status')).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(AUTO_CLOSE_MS * 5);
    });
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('dismiss(id) removes the toast immediately', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    let id = '';
    act(() => {
      id = result.current.push({ kind: 'success', message: 'x' });
    });
    expect(screen.getAllByRole('status')).toHaveLength(1);

    act(() => {
      result.current.dismiss(id);
    });
    expect(screen.queryAllByRole('status')).toHaveLength(0);
  });

  it('clicking the × button on an auto toast clears it before the timer fires', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.push({ kind: 'success', message: 'close me' });
    });
    expect(screen.getAllByRole('status')).toHaveLength(1);

    // userEvent は fake timer と相性が悪いので fireEvent で直接クリック
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: '閉じる' }));
    });
    expect(screen.queryAllByRole('status')).toHaveLength(0);
  });

  it('handles multiple toasts independently', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.push({ kind: 'success', message: 'one' });
    });
    act(() => {
      vi.advanceTimersByTime(AUTO_CLOSE_MS / 2);
      result.current.push({ kind: 'info', message: 'two' });
    });
    expect(screen.getAllByRole('status')).toHaveLength(2);

    // one が先に消える
    act(() => {
      vi.advanceTimersByTime(AUTO_CLOSE_MS / 2 + 5);
    });
    const remaining = screen.getAllByRole('status');
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toHaveTextContent('two');

    // 続いて two も消える
    act(() => {
      vi.advanceTimersByTime(AUTO_CLOSE_MS);
    });
    expect(screen.queryAllByRole('status')).toHaveLength(0);
  });

  it('throws if useToast is called outside of <ToastProvider>', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useToast())).toThrowError(/must be used within <ToastProvider>/);
    consoleErrorSpy.mockRestore();
  });
});
