import { describe, expect, it } from 'vitest';

import { findPrefecture, groupByRegion, PREFECTURE_REGION_ORDER, PREFECTURES } from './prefectures';

describe('PREFECTURES', () => {
  it('contains exactly 47 prefectures', () => {
    expect(PREFECTURES).toHaveLength(47);
  });

  it('every id is unique', () => {
    const ids = PREFECTURES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every prefecture has exactly 1-char kanji', () => {
    for (const p of PREFECTURES) {
      expect(p.kanji.length).toBe(1);
    }
  });

  it('curated flag is true for miyagi/nagano/kochi only', () => {
    const curated = PREFECTURES.filter((p) => p.curated).map((p) => p.id);
    expect(curated.sort()).toEqual(['kochi', 'miyagi', 'nagano']);
  });

  it('every prefecture has a non-empty note', () => {
    for (const p of PREFECTURES) {
      expect(p.note.length).toBeGreaterThan(0);
    }
  });
});

describe('findPrefecture', () => {
  it('returns the prefecture for a known id', () => {
    expect(findPrefecture('miyagi')?.prefecture).toBe('宮城県');
  });

  it('returns undefined for an unknown id', () => {
    expect(findPrefecture('atlantis')).toBeUndefined();
  });
});

describe('groupByRegion', () => {
  it('returns 9 groups in canonical order', () => {
    const groups = groupByRegion();
    expect(groups.map((g) => g.region)).toEqual(PREFECTURE_REGION_ORDER);
  });

  it('the union of all groups equals PREFECTURES', () => {
    const all = groupByRegion().flatMap((g) => g.items);
    expect(all).toHaveLength(PREFECTURES.length);
  });

  it('tohoku has 6 prefectures, kanto has 7', () => {
    const groups = groupByRegion();
    const tohoku = groups.find((g) => g.region === 'tohoku');
    const kanto = groups.find((g) => g.region === 'kanto');
    expect(tohoku?.items.length).toBe(6);
    expect(kanto?.items.length).toBe(7);
  });

  it('okinawa is its own group with 1 prefecture', () => {
    const groups = groupByRegion();
    const oki = groups.find((g) => g.region === 'okinawa');
    expect(oki?.items).toHaveLength(1);
    expect(oki?.items[0]?.id).toBe('okinawa');
  });
});
