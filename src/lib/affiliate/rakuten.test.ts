import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildEnroProductUrl,
  buildEnroStoreUrl,
  ENRO_PRODUCT_URL,
  ENRO_STORE_URL,
  toAffiliateUrl,
} from './rakuten';

describe('rakuten affiliate URL builder', () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID;

  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    if (ORIGINAL !== undefined) {
      process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID = ORIGINAL;
    } else {
      delete process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID;
    }
  });

  it('returns the raw URL when no affiliate id is set', () => {
    vi.stubEnv('NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID', '');
    expect(buildEnroStoreUrl()).toBe(ENRO_STORE_URL);
    expect(buildEnroProductUrl()).toBe(ENRO_PRODUCT_URL);
  });

  it('wraps the URL in the rakuten hgc redirect when an affiliate id is set', () => {
    vi.stubEnv('NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID', '12345678.abcdef.0123abcd.deadbeef');
    const store = buildEnroStoreUrl();
    expect(store).toContain('https://hb.afl.rakuten.co.jp/hgc/12345678.abcdef.0123abcd.deadbeef/');
    expect(store).toContain('pc=' + encodeURIComponent(ENRO_STORE_URL));
  });

  it('toAffiliateUrl works for any rakuten URL', () => {
    vi.stubEnv('NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID', 'aff-1');
    const out = toAffiliateUrl('https://item.rakuten.co.jp/foo/bar/');
    expect(out).toBe(
      'https://hb.afl.rakuten.co.jp/hgc/aff-1/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Ffoo%2Fbar%2F',
    );
  });

  it('trims surrounding whitespace from the affiliate id', () => {
    vi.stubEnv('NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID', '  aff-1  ');
    expect(buildEnroStoreUrl()).toContain('/hgc/aff-1/');
  });
});
