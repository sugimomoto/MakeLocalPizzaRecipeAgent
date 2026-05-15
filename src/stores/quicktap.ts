'use client';

/**
 * QuickTap 食材選択用の一時ストア (Zustand)。
 *
 * - 食材選択画面 (Tap2) で選択中の IngredientId 配列を保持
 * - 永続化なし (画面遷移を超えても残るが、リロードで消える)
 * - Tap2 → /candidates/[sessionId] 遷移時に呼び出し側で取り出して URL/sessionStorage に運ぶ
 *
 * 設計判断: localStorage には保存しない。地元 ID は端末ローカルに残す価値があるが、
 * 食材選択は「今この瞬間の気分」なので毎回ゼロから始める方が自然。
 */

import { create } from 'zustand';

import type { IngredientId } from '@/domain/ingredient';

export type QuickTapState = {
  selectedIngredients: IngredientId[];
  toggle: (id: IngredientId) => void;
  set: (ids: IngredientId[]) => void;
  clear: () => void;
};

export const useQuickTapStore = create<QuickTapState>((set) => ({
  selectedIngredients: [],

  toggle: (id) =>
    set((state) => ({
      selectedIngredients: state.selectedIngredients.includes(id)
        ? state.selectedIngredients.filter((x) => x !== id)
        : [...state.selectedIngredients, id],
    })),

  set: (ids) => set({ selectedIngredients: [...ids] }),

  clear: () => set({ selectedIngredients: [] }),
}));
