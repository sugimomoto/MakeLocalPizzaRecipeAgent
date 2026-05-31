import { describe, expect, it } from 'vitest';

import { extractIp, resolveRateLimitKey } from './key';

import type { AuthSubject } from '@/lib/http/with-auth';

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/test', { headers });
}

describe('extractIp', () => {
  it('returns null when XFF is absent', () => {
    expect(extractIp(makeRequest())).toBeNull();
  });

  it('returns the first IP from XFF', () => {
    expect(extractIp(makeRequest({ 'x-forwarded-for': '1.2.3.4' }))).toBe('1.2.3.4');
  });

  it('returns the first of multiple IPs', () => {
    expect(extractIp(makeRequest({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1, 192.168.0.1' }))).toBe(
      '1.2.3.4',
    );
  });

  it('trims surrounding whitespace', () => {
    expect(extractIp(makeRequest({ 'x-forwarded-for': '  1.2.3.4  , 10.0.0.1' }))).toBe('1.2.3.4');
  });

  it('returns null for empty string XFF', () => {
    expect(extractIp(makeRequest({ 'x-forwarded-for': '' }))).toBeNull();
  });
});

describe('resolveRateLimitKey', () => {
  it('returns guest key when subject.kind=guest', () => {
    const req = makeRequest({ 'x-forwarded-for': '1.2.3.4' });
    const subject: AuthSubject = { kind: 'guest', guestSessionId: 'g-1' };
    expect(resolveRateLimitKey(req, subject)).toEqual({
      kind: 'guest',
      guestSessionId: 'g-1',
    });
  });

  it('returns ip key when subject is anonymous and XFF present', () => {
    const req = makeRequest({ 'x-forwarded-for': '1.2.3.4' });
    const subject: AuthSubject = { kind: 'anonymous' };
    expect(resolveRateLimitKey(req, subject)).toEqual({ kind: 'ip', ip: '1.2.3.4' });
  });

  it('returns anonymous when no XFF and no guest', () => {
    const req = makeRequest();
    const subject: AuthSubject = { kind: 'anonymous' };
    expect(resolveRateLimitKey(req, subject)).toEqual({ kind: 'anonymous' });
  });

  it('prefers guest over IP even when XFF is present', () => {
    // NAT 配下の正規ユーザが巻き添えにならないための重要 invariant
    const req = makeRequest({ 'x-forwarded-for': '1.2.3.4' });
    const subject: AuthSubject = { kind: 'guest', guestSessionId: 'g-1' };
    expect(resolveRateLimitKey(req, subject).kind).toBe('guest');
  });
});
