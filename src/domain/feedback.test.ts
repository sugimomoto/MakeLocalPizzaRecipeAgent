import { describe, expect, it } from 'vitest';

import {
  clampGuestCount,
  clampScore,
  emptyFeedback,
  FEEDBACK_AXIS_ORDER,
  FEEDBACK_CHIP_CAP,
  FEEDBACK_CHIP_OPTIONS,
  isFeedbackComplete,
  normalizeChipList,
} from './feedback';

describe('feedback domain helpers', () => {
  describe('emptyFeedback', () => {
    it('overallRating + axes 4 つはすべて 0、配列は空、guestCount は null', () => {
      const e = emptyFeedback();
      expect(e.overallRating).toBe(0);
      expect(e.axes).toEqual({ taste: 0, look: 0, story: 0, again: 0 });
      expect(e.whatWorked).toEqual([]);
      expect(e.whatToTune).toEqual([]);
      expect(e.guestVibe).toEqual([]);
      expect(e.guestCount).toBeNull();
    });
  });

  describe('isFeedbackComplete', () => {
    it('overallRating === 0 では false', () => {
      expect(isFeedbackComplete({ overallRating: 0 })).toBe(false);
    });
    it.each([1, 2, 3, 4, 5] as const)('overallRating === %s では true', (n) => {
      expect(isFeedbackComplete({ overallRating: n })).toBe(true);
    });
  });

  describe('clampScore', () => {
    it.each([
      [0, 0],
      [1, 1],
      [3, 3],
      [5, 5],
      [-1, 0],
      [10, 5],
      [2.6, 3],
      [2.4, 2],
    ])('clampScore(%s) === %s', (input, expected) => {
      expect(clampScore(input)).toBe(expected);
    });

    it('数値以外は 0', () => {
      expect(clampScore('5')).toBe(0);
      expect(clampScore(null)).toBe(0);
      expect(clampScore(undefined)).toBe(0);
      expect(clampScore(NaN)).toBe(0);
      expect(clampScore(Infinity)).toBe(0);
    });
  });

  describe('clampGuestCount', () => {
    it('1..20 を整数で返す', () => {
      expect(clampGuestCount(1)).toBe(1);
      expect(clampGuestCount(4)).toBe(4);
      expect(clampGuestCount(20)).toBe(20);
    });
    it('1 未満は null、20 超は 20 にキャップ', () => {
      expect(clampGuestCount(0)).toBeNull();
      expect(clampGuestCount(-3)).toBeNull();
      expect(clampGuestCount(99)).toBe(20);
    });
    it('数値以外は null', () => {
      expect(clampGuestCount('3')).toBeNull();
      expect(clampGuestCount(null)).toBeNull();
      expect(clampGuestCount(undefined)).toBeNull();
    });
  });

  describe('normalizeChipList', () => {
    it('マスタに含まれる文字列のみ通す + 順序はマスタ準拠', () => {
      const result = normalizeChipList('whatWorked', [
        'ストーリーがウケた',
        '焼き加減',
        '食材の組合せ',
      ]);
      expect(result).toEqual(['食材の組合せ', 'ストーリーがウケた', '焼き加減']);
    });
    it('未知の値 / 型違いは除外', () => {
      const result = normalizeChipList('whatWorked', ['食材の組合せ', '謎の項目', 123, null]);
      expect(result).toEqual(['食材の組合せ']);
    });
    it('重複は排除される', () => {
      const result = normalizeChipList('whatWorked', ['見た目', '見た目']);
      expect(result).toEqual(['見た目']);
    });
    it('配列じゃない入力は空配列', () => {
      expect(normalizeChipList('guestVibe', 'string')).toEqual([]);
      expect(normalizeChipList('guestVibe', null)).toEqual([]);
    });
  });

  describe('定数の不変条件', () => {
    it('FEEDBACK_CHIP_CAP は 6', () => {
      expect(FEEDBACK_CHIP_CAP).toBe(6);
    });
    it('各群のチップは 5 個以上 (cap=6 + 余裕) かつ重複なし', () => {
      for (const group of ['whatWorked', 'whatToTune', 'guestVibe'] as const) {
        const opts = FEEDBACK_CHIP_OPTIONS[group];
        expect(opts.length).toBeGreaterThanOrEqual(5);
        expect(new Set(opts).size).toBe(opts.length);
      }
    });
    it('AXIS_ORDER は 4 個 + 重複なし', () => {
      expect(FEEDBACK_AXIS_ORDER).toHaveLength(4);
      expect(new Set(FEEDBACK_AXIS_ORDER).size).toBe(4);
    });
  });
});
