'use client';

/**
 * useToast / ToastProvider — グローバル Toast Context。
 *
 * - `push({ kind, message, auto? })` で新 Toast を追加 (id は自動採番)
 * - `auto !== false` のものは 2.5s で自動消滅 (デザイン要件)
 * - 手動 dismiss は ToastHost 経由で onDismiss を発火
 * - dismiss は同一 id の任意タイミング (auto と手動の race は filter で吸収)
 *
 * Provider 配下に <ToastHost /> を内蔵するので、layout に <ToastProvider> を
 * ラップすれば追加配置は不要。
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { ToastHost, type ToastHostItem } from '@/components/notify/ToastHost';

import type { ToastKind } from '@/components/notify/Toast';

export const TOAST_AUTO_CLOSE_MS = 2500;

export type PushToastInput = {
  kind: ToastKind;
  message: ReactNode;
  /** 既定 true。false にすると自動 close せず、× ボタンでの手動 close のみ */
  auto?: boolean;
};

export type ToastContextValue = {
  push: (input: PushToastInput) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let _seq = 0;
function nextId(): string {
  // crypto.randomUUID() は SSR でも使えるが、Node 環境差を避けるため counter ベース
  _seq += 1;
  return `t-${Date.now().toString(36)}-${_seq}`;
}

export type ToastProviderProps = {
  children: ReactNode;
  /** test 用: 自動 close までの ms を上書き (省略時は TOAST_AUTO_CLOSE_MS) */
  autoCloseMs?: number;
};

export function ToastProvider({
  children,
  autoCloseMs = TOAST_AUTO_CLOSE_MS,
}: ToastProviderProps): React.JSX.Element {
  const [items, setItems] = useState<ToastHostItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setItems((xs) => xs.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (input: PushToastInput): string => {
      const id = nextId();
      const auto = input.auto !== false;
      setItems((xs) => [...xs, { id, kind: input.kind, message: input.message, auto }]);
      if (auto) {
        const timer = setTimeout(() => {
          timersRef.current.delete(id);
          setItems((xs) => xs.filter((x) => x.id !== id));
        }, autoCloseMs);
        timersRef.current.set(id, timer);
      }
      return id;
    },
    [autoCloseMs],
  );

  const value = useMemo<ToastContextValue>(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastHost items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within <ToastProvider>');
  }
  return ctx;
}
