import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearGuestSessionId,
  getOrCreateGuestSessionId,
  GUEST_SESSION_PREFIX,
  GUEST_SESSION_STORAGE_KEY,
  readGuestSessionId,
} from './guest-session';

const UUID_V4 = /^guest_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('getOrCreateGuestSessionId', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('issues a new id with the guest_ prefix and a UUID v4 body', () => {
    const id = getOrCreateGuestSessionId();
    expect(id.startsWith(GUEST_SESSION_PREFIX)).toBe(true);
    expect(id).toMatch(UUID_V4);
  });

  it('returns the same id on subsequent calls (persistent)', () => {
    const a = getOrCreateGuestSessionId();
    const b = getOrCreateGuestSessionId();
    expect(a).toBe(b);
  });

  it('writes the id to the versioned storage key', () => {
    const id = getOrCreateGuestSessionId();
    expect(window.localStorage.getItem(GUEST_SESSION_STORAGE_KEY)).toBe(id);
    expect(GUEST_SESSION_STORAGE_KEY).toBe('mlpr.guestSessionId.v1');
  });

  it('replaces a stored value that is not a valid guest_<uuid>', () => {
    window.localStorage.setItem(GUEST_SESSION_STORAGE_KEY, 'not-a-guest-id');
    const id = getOrCreateGuestSessionId();
    expect(id).toMatch(UUID_V4);
    expect(window.localStorage.getItem(GUEST_SESSION_STORAGE_KEY)).toBe(id);
  });

  it('replaces a guest_-prefixed value whose body is not UUID v4', () => {
    window.localStorage.setItem(GUEST_SESSION_STORAGE_KEY, 'guest_short');
    const id = getOrCreateGuestSessionId();
    expect(id).toMatch(UUID_V4);
  });
});

describe('readGuestSessionId', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns null when nothing has been written', () => {
    expect(readGuestSessionId()).toBeNull();
  });

  it('returns the persisted id', () => {
    const issued = getOrCreateGuestSessionId();
    expect(readGuestSessionId()).toBe(issued);
  });

  it('returns null for malformed stored values without auto-issuing', () => {
    window.localStorage.setItem(GUEST_SESSION_STORAGE_KEY, 'corrupted');
    expect(readGuestSessionId()).toBeNull();
    // 元の壊れた値はそのまま (read は副作用を持たない)
    expect(window.localStorage.getItem(GUEST_SESSION_STORAGE_KEY)).toBe('corrupted');
  });
});

describe('clearGuestSessionId', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('removes the stored id', () => {
    getOrCreateGuestSessionId();
    clearGuestSessionId();
    expect(window.localStorage.getItem(GUEST_SESSION_STORAGE_KEY)).toBeNull();
    expect(readGuestSessionId()).toBeNull();
  });

  it('next getOrCreate call after clear returns a fresh id', () => {
    const first = getOrCreateGuestSessionId();
    clearGuestSessionId();
    const second = getOrCreateGuestSessionId();
    expect(second).not.toBe(first);
  });
});
