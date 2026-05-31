import { describe, expect, it } from 'vitest';

import { buildDocId, hourBucket, keyValueOf, secondsUntilNextHour } from './bucket';

describe('hourBucket', () => {
  it('formats YYYYMMDDHH in UTC', () => {
    expect(hourBucket(new Date('2026-05-30T15:34:21Z'))).toBe('2026053015');
  });

  it('zero-pads single-digit month/day/hour', () => {
    expect(hourBucket(new Date('2026-01-05T03:00:00Z'))).toBe('2026010503');
  });

  it('uses UTC even if the host TZ would render differently', () => {
    // 例えば JST だと 2026-01-01T00:00:00Z は 2025-12-31T09 (NG)
    expect(hourBucket(new Date('2026-01-01T00:00:00Z'))).toBe('2026010100');
  });

  it('handles end-of-year boundary', () => {
    expect(hourBucket(new Date('2026-12-31T23:59:59Z'))).toBe('2026123123');
  });
});

describe('secondsUntilNextHour', () => {
  it('returns full 3600 just at the hour boundary', () => {
    expect(secondsUntilNextHour(new Date('2026-05-30T15:00:00Z'))).toBe(3600);
  });

  it('returns ~1 second near the next hour', () => {
    // 15:59:59.001 → ~1 秒
    const s = secondsUntilNextHour(new Date('2026-05-30T15:59:59.001Z'));
    expect(s).toBeGreaterThanOrEqual(1);
    expect(s).toBeLessThanOrEqual(1);
  });

  it('never returns less than 1', () => {
    expect(secondsUntilNextHour(new Date('2026-05-30T15:59:59.999Z'))).toBeGreaterThanOrEqual(1);
    expect(secondsUntilNextHour(new Date('2026-05-30T15:59:59.9999Z'))).toBeGreaterThanOrEqual(1);
  });

  it('rolls past midnight UTC', () => {
    expect(secondsUntilNextHour(new Date('2026-05-30T23:30:00Z'))).toBe(1800);
  });
});

describe('keyValueOf', () => {
  it('returns uid for auth', () => {
    expect(keyValueOf({ kind: 'auth', uid: 'u-1' })).toBe('u-1');
  });
  it('returns guestSessionId for guest', () => {
    expect(keyValueOf({ kind: 'guest', guestSessionId: 'g-1' })).toBe('g-1');
  });
  it('returns ip for ip', () => {
    expect(keyValueOf({ kind: 'ip', ip: '1.2.3.4' })).toBe('1.2.3.4');
  });
  it('returns empty string for anonymous', () => {
    expect(keyValueOf({ kind: 'anonymous' })).toBe('');
  });
});

describe('buildDocId', () => {
  it('joins bucket + kind + value + routeShort with underscores', () => {
    const id = buildDocId(
      '2026053015',
      { kind: 'guest', guestSessionId: 'abc123' },
      '/api/recipes/[candidateId]',
    );
    expect(id).toBe('2026053015_guest_abc123_recipes');
  });

  it('sanitizes slashes in keyValue', () => {
    const id = buildDocId(
      '2026053015',
      { kind: 'guest', guestSessionId: 'sess/with/slash' },
      '/api/quicktap/sessions',
    );
    expect(id).toBe('2026053015_guest_sess-with-slash_qt-sessions');
  });

  it('produces different IDs for different routes (same bucket+key)', () => {
    const a = buildDocId('2026053015', { kind: 'ip', ip: '1.2.3.4' }, '/api/recipes/[candidateId]');
    const b = buildDocId('2026053015', { kind: 'ip', ip: '1.2.3.4' }, '/api/quicktap/sessions');
    expect(a).not.toBe(b);
  });

  it('produces different IDs for different bucket (same key+route)', () => {
    const a = buildDocId('2026053015', { kind: 'ip', ip: '1.2.3.4' }, '/api/recipes/[candidateId]');
    const b = buildDocId('2026053016', { kind: 'ip', ip: '1.2.3.4' }, '/api/recipes/[candidateId]');
    expect(a).not.toBe(b);
  });
});
