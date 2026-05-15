import { describe, expect, it } from 'vitest';

import { isRegion, REGIONS } from './locale';

import type { City, Locale, Region } from './locale';

describe('Region', () => {
  it('contains exactly the 8 Japanese geographic regions', () => {
    expect(REGIONS).toEqual([
      'hokkaido',
      'tohoku',
      'kanto',
      'chubu',
      'kinki',
      'chugoku',
      'shikoku',
      'kyushu-okinawa',
    ]);
    expect(REGIONS.length).toBe(8);
  });

  it('isRegion accepts every value in REGIONS', () => {
    for (const r of REGIONS) {
      expect(isRegion(r)).toBe(true);
    }
  });

  it('isRegion rejects unknown strings, numbers, and null', () => {
    expect(isRegion('okinawa')).toBe(false);
    expect(isRegion('Tohoku')).toBe(false); // case-sensitive
    expect(isRegion(0)).toBe(false);
    expect(isRegion(null)).toBe(false);
    expect(isRegion(undefined)).toBe(false);
  });
});

describe('Locale shape', () => {
  it('accepts a minimal valid locale (no cities)', () => {
    const locale: Locale = {
      id: 'miyagi',
      prefecture: '宮城県',
      prefectureCode: 'JP-04',
      region: 'tohoku',
    };
    expect(locale.id).toBe('miyagi');
    expect(locale.cities).toBeUndefined();
  });

  it('accepts a locale with cities', () => {
    const sendai: City = { id: 'sendai', name: '仙台市' };
    const locale: Locale = {
      id: 'miyagi-sendai',
      prefecture: '宮城県',
      prefectureCode: 'JP-04',
      region: 'tohoku',
      cities: [sendai],
    };
    expect(locale.cities?.[0]).toEqual(sendai);
  });

  it('Region type narrows correctly via isRegion', () => {
    const candidate: unknown = 'tohoku';
    if (isRegion(candidate)) {
      const r: Region = candidate;
      expect(r).toBe('tohoku');
    } else {
      throw new Error('isRegion should accept "tohoku"');
    }
  });
});
