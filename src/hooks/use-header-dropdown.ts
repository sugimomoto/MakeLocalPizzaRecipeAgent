'use client';

/**
 * useHeaderDropdown — AvatarButton + ▾ で開閉するメニューの状態 + a11y キー操作
 *
 * 仕様 (Slice 7 FR-7-10 / 設計 §4):
 * - トリガ: Avatar+▾ クリック → toggle、再クリック → close
 * - 閉じる条件: (a) 外側 pointerdown (b) Esc キー (c) menuitem 選択
 *               (d) Avatar 再タップ
 * - role="menu" + 各行 role="menuitem"
 * - ↑↓ で menuitem 巡回 (循環)、Enter で確定はメニュー側の onClick が処理
 * - 初期 focus = 1 行目 menuitem (HeaderDropdown が開いた直後に渡される)
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type UseHeaderDropdownResult = {
  open: boolean;
  toggle: () => void;
  close: () => void;
  /** AvatarButton (トリガ) に spread。aria-expanded / aria-haspopup を制御 */
  triggerProps: {
    ref: React.RefObject<HTMLButtonElement | null>;
    'aria-expanded': boolean;
    'aria-haspopup': 'menu';
  };
  /** HeaderDropdown 側 (menu container) に spread。Esc + ↑↓ ハンドラ */
  menuProps: {
    ref: React.RefObject<HTMLDivElement | null>;
    role: 'menu';
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  };
};

export function useHeaderDropdown(): UseHeaderDropdownResult {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  // outside pointerdown で close (trigger / menu 内は除く)
  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    // capture phase で他のハンドラより先に拾う
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, [open]);

  // Esc で close (グローバル)
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // open → 最初の menuitem に focus
  useEffect(() => {
    if (!open || !menuRef.current) return;
    const first = menuRef.current.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus();
  }, [open]);

  // menu 内の ↑↓ で循環 (Tab は browser default を尊重)
  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const container = menuRef.current;
    if (!container) return;
    const items = Array.from(container.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    if (items.length === 0) return;
    const current = document.activeElement as HTMLElement | null;
    const idx = current ? items.indexOf(current) : -1;
    e.preventDefault();
    const next =
      e.key === 'ArrowDown'
        ? items[(idx + 1) % items.length]
        : items[(idx - 1 + items.length) % items.length];
    next?.focus();
  }, []);

  return {
    open,
    toggle,
    close,
    triggerProps: {
      ref: triggerRef,
      'aria-expanded': open,
      'aria-haspopup': 'menu',
    },
    menuProps: {
      ref: menuRef,
      role: 'menu',
      onKeyDown,
    },
  };
}
