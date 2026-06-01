import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GUEST_SESSION_STORAGE_KEY } from '@/lib/localstorage/guest-session';

import { apiFetch } from './api-fetch';

type FetchCallArgs = [string, RequestInit];

/** vi.fn の `.mock.calls` を 型安全に [url, init] として取り出す */
function getCallArgs(mock: ReturnType<typeof vi.fn>, idx = 0): FetchCallArgs {
  const call = mock.mock.calls[idx];
  if (!call || call.length < 2) {
    throw new Error(`mock not called or missing args (got ${call?.length ?? 0})`);
  }
  return [call[0] as string, call[1] as RequestInit];
}

describe('apiFetch', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // 安定化用に固定 UUID を入れておく
    window.localStorage.setItem(
      GUEST_SESSION_STORAGE_KEY,
      'guest_11111111-1111-4111-8111-111111111111',
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('attaches content-type and x-mlpr-guest-session-id by default', async () => {
    const fetchMock = vi.fn(async () => new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/api/test', { method: 'POST', body: JSON.stringify({ a: 1 }) });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = getCallArgs(fetchMock);
    expect(url).toBe('/api/test');
    const headers = init.headers as Record<string, string>;
    expect(headers['content-type']).toBe('application/json');
    expect(headers['x-mlpr-guest-session-id']).toBe('guest_11111111-1111-4111-8111-111111111111');
    expect(init.method).toBe('POST');
  });

  it('allows extra headers to be merged (does not override the defaults silently)', async () => {
    const fetchMock = vi.fn(async () => new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/api/test', { method: 'POST', headers: { 'x-extra': 'foo' } });

    const [, init] = getCallArgs(fetchMock);
    const headers = init.headers as Record<string, string>;
    expect(headers['x-extra']).toBe('foo');
    expect(headers['content-type']).toBe('application/json');
    expect(headers['x-mlpr-guest-session-id']).toBe('guest_11111111-1111-4111-8111-111111111111');
  });

  it('mints a new guest session id if none was stored', async () => {
    window.localStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
    const fetchMock = vi.fn(async () => new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/api/test');

    const [, init] = getCallArgs(fetchMock);
    const headers = init.headers as Record<string, string>;
    expect(headers['x-mlpr-guest-session-id']).toMatch(/^guest_[0-9a-f-]{36}$/);
    // 払い出し時に localStorage にも永続化されている
    expect(window.localStorage.getItem(GUEST_SESSION_STORAGE_KEY)).toBe(
      headers['x-mlpr-guest-session-id'],
    );
  });

  it('forwards method / body / signal verbatim', async () => {
    const fetchMock = vi.fn(async () => new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);

    const ac = new AbortController();
    await apiFetch('/api/x', { method: 'POST', body: '{"y":2}', signal: ac.signal });

    const [, init] = getCallArgs(fetchMock);
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"y":2}');
    expect(init.signal).toBe(ac.signal);
  });
});
