/**
 * テスト用の共通 React wrapper (Slice 9.1)
 *
 * Toast / SignInModal 等の Context を必要とするコンポーネント・hook を
 * 個別のテストファイルで都度ラッパー定義するのを避けるため、ここに集約する。
 *
 * 使い方:
 *
 *   import { withToastProvider } from '@/test-utils/wrappers';
 *
 *   const { result } = renderHook(() => useFoo(), withToastProvider);
 *   render(<Foo />, withToastProvider);
 */

import { ToastProvider } from '@/hooks/use-toast';

import type { ReactNode } from 'react';

export function ToastWrapper({ children }: { children: ReactNode }): React.JSX.Element {
  return <ToastProvider>{children}</ToastProvider>;
}

/**
 * `renderHook` / `render` の第二引数にそのまま渡せる options。
 * `withToastProvider` という名前で呼び出すと「Toast プロバイダで囲む」が読みやすい。
 */
export const withToastProvider = { wrapper: ToastWrapper } as const;
