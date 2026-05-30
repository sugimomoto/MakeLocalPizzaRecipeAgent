import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearOvenProfile,
  OVEN_PROFILE_STORAGE_KEY,
  readOvenProfile,
  writeOvenProfile,
} from './oven-profile';

describe('oven-profile localStorage R/W', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns null when nothing has been written', () => {
    expect(readOvenProfile()).toBeNull();
  });

  it('writes and reads back an enro profile roundtrip', () => {
    writeOvenProfile('enro_450c_90s', 1736743200000);
    expect(readOvenProfile()).toEqual({ id: 'enro_450c_90s', selectedAt: 1736743200000 });
  });

  it('writes and reads back a home oven profile roundtrip', () => {
    writeOvenProfile('home_oven_280c_10m', 1736743200000);
    expect(readOvenProfile()).toEqual({ id: 'home_oven_280c_10m', selectedAt: 1736743200000 });
  });

  it('uses Date.now() when no timestamp is supplied', () => {
    const before = Date.now();
    writeOvenProfile('enro_450c_90s');
    const after = Date.now();
    const stored = readOvenProfile();
    expect(stored?.id).toBe('enro_450c_90s');
    expect(stored?.selectedAt).toBeGreaterThanOrEqual(before);
    expect(stored?.selectedAt).toBeLessThanOrEqual(after);
  });

  it('clearOvenProfile removes the entry', () => {
    writeOvenProfile('enro_450c_90s');
    clearOvenProfile();
    expect(readOvenProfile()).toBeNull();
    expect(window.localStorage.getItem(OVEN_PROFILE_STORAGE_KEY)).toBeNull();
  });

  it('uses the versioned key mlpr.ovenProfile.v1', () => {
    writeOvenProfile('enro_450c_90s');
    expect(window.localStorage.getItem('mlpr.ovenProfile.v1')).not.toBeNull();
    expect(OVEN_PROFILE_STORAGE_KEY).toBe('mlpr.ovenProfile.v1');
  });
});

describe('oven-profile localStorage recovery', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('recovers from invalid JSON by returning null and clearing the entry', () => {
    window.localStorage.setItem(OVEN_PROFILE_STORAGE_KEY, 'not-json{{{');
    expect(readOvenProfile()).toBeNull();
    expect(window.localStorage.getItem(OVEN_PROFILE_STORAGE_KEY)).toBeNull();
  });

  it('recovers from a wrong-shape JSON object by returning null and clearing the entry', () => {
    window.localStorage.setItem(OVEN_PROFILE_STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
    expect(readOvenProfile()).toBeNull();
    expect(window.localStorage.getItem(OVEN_PROFILE_STORAGE_KEY)).toBeNull();
  });

  it('rejects records with unknown oven profile id', () => {
    window.localStorage.setItem(
      OVEN_PROFILE_STORAGE_KEY,
      JSON.stringify({ id: 'gas_burner_500c', selectedAt: 1 }),
    );
    expect(readOvenProfile()).toBeNull();
    expect(window.localStorage.getItem(OVEN_PROFILE_STORAGE_KEY)).toBeNull();
  });

  it('rejects records with non-numeric selectedAt', () => {
    window.localStorage.setItem(
      OVEN_PROFILE_STORAGE_KEY,
      JSON.stringify({ id: 'enro_450c_90s', selectedAt: 'yesterday' }),
    );
    expect(readOvenProfile()).toBeNull();
  });
});
