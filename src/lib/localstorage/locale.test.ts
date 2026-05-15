import { beforeEach, describe, expect, it } from 'vitest';

import { clearLocale, LOCALE_STORAGE_KEY, readLocale, writeLocale } from './locale';

describe('locale localStorage R/W', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns null when nothing has been written', () => {
    expect(readLocale()).toBeNull();
  });

  it('writes and reads back a locale roundtrip', () => {
    writeLocale('miyagi', 1736743200000);
    expect(readLocale()).toEqual({ localeId: 'miyagi', selectedAt: 1736743200000 });
  });

  it('uses Date.now() when no timestamp is supplied', () => {
    const before = Date.now();
    writeLocale('nagano');
    const after = Date.now();
    const stored = readLocale();
    expect(stored?.localeId).toBe('nagano');
    expect(stored?.selectedAt).toBeGreaterThanOrEqual(before);
    expect(stored?.selectedAt).toBeLessThanOrEqual(after);
  });

  it('clearLocale removes the entry', () => {
    writeLocale('miyagi');
    clearLocale();
    expect(readLocale()).toBeNull();
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull();
  });

  it('uses the versioned key mlpr.locale.v1', () => {
    writeLocale('miyagi');
    expect(window.localStorage.getItem('mlpr.locale.v1')).not.toBeNull();
    expect(LOCALE_STORAGE_KEY).toBe('mlpr.locale.v1');
  });
});

describe('locale localStorage recovery', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('recovers from invalid JSON by returning null and clearing the entry', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'not-json{{{');
    expect(readLocale()).toBeNull();
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull();
  });

  it('recovers from a wrong-shape JSON object by returning null and clearing the entry', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
    expect(readLocale()).toBeNull();
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull();
  });

  it('rejects records with empty localeId', () => {
    window.localStorage.setItem(
      LOCALE_STORAGE_KEY,
      JSON.stringify({ localeId: '', selectedAt: 1 }),
    );
    expect(readLocale()).toBeNull();
  });

  it('rejects records with non-numeric selectedAt', () => {
    window.localStorage.setItem(
      LOCALE_STORAGE_KEY,
      JSON.stringify({ localeId: 'miyagi', selectedAt: 'yesterday' }),
    );
    expect(readLocale()).toBeNull();
  });
});
