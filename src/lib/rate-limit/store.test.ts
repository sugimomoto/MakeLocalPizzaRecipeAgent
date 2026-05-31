/**
 * MemoryRateLimitStore のテスト (Slice 9)。
 *
 * FirestoreRateLimitStore の実環境テストは Firestore Emulator が必要なため、
 * route handler 統合テストでカバーする方針 (本ファイルではスコープ外)。
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { buildDocId } from './bucket';
import { MemoryRateLimitStore } from './store';

import type { RateLimitKey, RateLimitRouteKey } from './types';

const NOW = new Date('2026-05-30T15:00:00Z');
const BUCKET = '2026053015';
const GUEST: RateLimitKey = { kind: 'guest', guestSessionId: 'g-1' };
const IP: RateLimitKey = { kind: 'ip', ip: '1.2.3.4' };
const RECIPES: RateLimitRouteKey = '/api/recipes/[candidateId]';
const SESSIONS: RateLimitRouteKey = '/api/quicktap/sessions';

describe('MemoryRateLimitStore', () => {
  let store: MemoryRateLimitStore;

  beforeEach(() => {
    store = new MemoryRateLimitStore();
  });

  it('allows requests up to the limit', async () => {
    for (let i = 0; i < 5; i++) {
      const decision = await store.tryConsume({
        bucket: BUCKET,
        key: GUEST,
        routeKey: RECIPES,
        limit: 5,
        now: NOW,
      });
      expect(decision).toEqual({ allowed: true, remaining: 5 - (i + 1) });
    }
  });

  it('rejects requests beyond the limit with retryAfter', async () => {
    for (let i = 0; i < 5; i++) {
      await store.tryConsume({
        bucket: BUCKET,
        key: GUEST,
        routeKey: RECIPES,
        limit: 5,
        now: NOW,
      });
    }
    const decision = await store.tryConsume({
      bucket: BUCKET,
      key: GUEST,
      routeKey: RECIPES,
      limit: 5,
      now: NOW,
    });
    expect(decision.allowed).toBe(false);
    if (decision.allowed) throw new Error('unreachable');
    expect(decision.retryAfterSeconds).toBe(3600);
  });

  it('separates counters per route (same key, different route)', async () => {
    for (let i = 0; i < 5; i++) {
      await store.tryConsume({
        bucket: BUCKET,
        key: GUEST,
        routeKey: RECIPES,
        limit: 5,
        now: NOW,
      });
    }
    const decision = await store.tryConsume({
      bucket: BUCKET,
      key: GUEST,
      routeKey: SESSIONS,
      limit: 10,
      now: NOW,
    });
    expect(decision).toEqual({ allowed: true, remaining: 9 });
  });

  it('separates counters per bucket (same key, different hour)', async () => {
    for (let i = 0; i < 5; i++) {
      await store.tryConsume({
        bucket: BUCKET,
        key: GUEST,
        routeKey: RECIPES,
        limit: 5,
        now: NOW,
      });
    }
    const nextHour = new Date('2026-05-30T16:00:00Z');
    const decision = await store.tryConsume({
      bucket: '2026053016',
      key: GUEST,
      routeKey: RECIPES,
      limit: 5,
      now: nextHour,
    });
    expect(decision).toEqual({ allowed: true, remaining: 4 });
  });

  it('separates counters per key (same bucket+route)', async () => {
    for (let i = 0; i < 5; i++) {
      await store.tryConsume({
        bucket: BUCKET,
        key: GUEST,
        routeKey: RECIPES,
        limit: 5,
        now: NOW,
      });
    }
    const decision = await store.tryConsume({
      bucket: BUCKET,
      key: IP,
      routeKey: RECIPES,
      limit: 5,
      now: NOW,
    });
    expect(decision).toEqual({ allowed: true, remaining: 4 });
  });

  it('always allows anonymous (local dev safeguard)', async () => {
    const anon: RateLimitKey = { kind: 'anonymous' };
    for (let i = 0; i < 100; i++) {
      const decision = await store.tryConsume({
        bucket: BUCKET,
        key: anon,
        routeKey: RECIPES,
        limit: 5,
        now: NOW,
      });
      expect(decision.allowed).toBe(true);
    }
  });

  it('reset() clears counters', async () => {
    for (let i = 0; i < 5; i++) {
      await store.tryConsume({
        bucket: BUCKET,
        key: GUEST,
        routeKey: RECIPES,
        limit: 5,
        now: NOW,
      });
    }
    store.reset();
    const decision = await store.tryConsume({
      bucket: BUCKET,
      key: GUEST,
      routeKey: RECIPES,
      limit: 5,
      now: NOW,
    });
    expect(decision).toEqual({ allowed: true, remaining: 4 });
  });

  it('peek() returns the current count by doc id', async () => {
    await store.tryConsume({
      bucket: BUCKET,
      key: GUEST,
      routeKey: RECIPES,
      limit: 5,
      now: NOW,
    });
    await store.tryConsume({
      bucket: BUCKET,
      key: GUEST,
      routeKey: RECIPES,
      limit: 5,
      now: NOW,
    });
    expect(store.peek(buildDocId(BUCKET, GUEST, RECIPES))).toBe(2);
  });
});
