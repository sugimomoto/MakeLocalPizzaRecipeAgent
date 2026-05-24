/**
 * Feedback — 「作ってみた」記録 (Slice 7)
 *
 * users/{uid}/savedRecipes/{candidateId}.feedback に埋め込み保存。
 * users/{uid}/drafts/{candidateId} に同 shape の partial を 3 秒 debounce で自動保存。
 *
 * 設計詳細は `.steering/20260524-slice7-feedback/design.md` §1。
 */

import type { Strategy } from './candidate';

/** 観点別評価のキー — UI 表示順 = ['味', '見た目', 'ストーリー', 'また作りたい'] */
export type FeedbackAxisKey = 'taste' | 'look' | 'story' | 'again';

/** 0..5 のスコア。0 = 未評価。submit 時に overallRating は 1 以上必須 */
export type FeedbackScore = 0 | 1 | 2 | 3 | 4 | 5;

export type Feedback = {
  overallRating: FeedbackScore;
  axes: Record<FeedbackAxisKey, FeedbackScore>;
  whatWorked: string[];
  whatToTune: string[];
  guestVibe: string[];
  /** 1..20 の整数 / null = 未入力 */
  guestCount: number | null;
  /** 将来 UI 用の予約スロット (Slice 7 では入力 UI 持たない) */
  note?: string;
  /** 初回保存時の Firestore serverTimestamp を Date に正規化したもの */
  cookedAt: Date;
  updatedAt: Date;
};

/** 下書き (savedRecipes/{id}.feedback の前段、drafts/{id}) */
export type FeedbackDraft = Partial<Omit<Feedback, 'cookedAt' | 'updatedAt'>> & {
  updatedAt: Date;
};

/** チップ候補マスタ — UI 表示順 / i18n 元 */
export const FEEDBACK_CHIP_OPTIONS = {
  whatWorked: ['食材の組合せ', 'ストーリーがウケた', '焼き加減', '見た目', '量', 'ワインとの相性'],
  whatToTune: ['塩味', '焼成時間', '生地の厚さ', 'トッピング量', '酸味', '油分'],
  guestVibe: ['会話が弾んだ', '驚かれた', 'おかわり続出', '写真に撮られた', '地元トークに発展'],
} as const;

export type FeedbackChipGroup = keyof typeof FEEDBACK_CHIP_OPTIONS;

/** 各群最大選択数 (7 個目で aria-disabled + Toast) */
export const FEEDBACK_CHIP_CAP = 6;

export const FEEDBACK_GUEST_COUNT_MIN = 1;
export const FEEDBACK_GUEST_COUNT_MAX = 20;

/** 観点ラベル — UI 表示順 */
export const FEEDBACK_AXIS_LABELS: Record<FeedbackAxisKey, string> = {
  taste: '味',
  look: '見た目',
  story: 'ストーリー',
  again: 'また作りたい',
};

export const FEEDBACK_AXIS_ORDER: FeedbackAxisKey[] = ['taste', 'look', 'story', 'again'];

/** 空状態 (初期化用) */
export function emptyFeedback(): Omit<Feedback, 'cookedAt' | 'updatedAt'> {
  return {
    overallRating: 0,
    axes: { taste: 0, look: 0, story: 0, again: 0 },
    whatWorked: [],
    whatToTune: [],
    guestVibe: [],
    guestCount: null,
  };
}

/** submit 可否判定 (overallRating が 1 以上で submit 可能) */
export function isFeedbackComplete(f: Pick<Feedback, 'overallRating'>): boolean {
  return f.overallRating >= 1;
}

/** 0..5 に丸める (NaN / boolean / 範囲外を吸収) */
export function clampScore(v: unknown): FeedbackScore {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  const n = Math.round(v);
  if (n <= 0) return 0;
  if (n >= 5) return 5;
  return n as FeedbackScore;
}

/** ゲスト数を 1..20 の整数 or null に正規化 */
export function clampGuestCount(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  if (n < FEEDBACK_GUEST_COUNT_MIN) return null;
  if (n > FEEDBACK_GUEST_COUNT_MAX) return FEEDBACK_GUEST_COUNT_MAX;
  return n;
}

/** チップ配列をマスタでフィルタ + 重複排除 (順序はマスタ優先) */
export function normalizeChipList(group: FeedbackChipGroup, raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const set = new Set(raw.filter((x): x is string => typeof x === 'string'));
  return FEEDBACK_CHIP_OPTIONS[group].filter((opt) => set.has(opt));
}

/** Strategy ラベル (FurusatoMark 等で参照される表示専用) */
export const STRATEGY_LABEL: Record<Strategy, string> = {
  exploit: '王道',
  tune: '一歩外す',
  explore: '大冒険',
};
