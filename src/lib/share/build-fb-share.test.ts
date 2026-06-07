import { describe, expect, it } from 'vitest';

import { buildFacebookShareUrl } from './build-fb-share';

describe('buildFacebookShareUrl', () => {
  it('encodes the share URL into the u query parameter', () => {
    const url = buildFacebookShareUrl('https://furusato-pizza.jp/share/abc-123');
    const parsed = new URL(url);
    expect(parsed.hostname).toBe('www.facebook.com');
    expect(parsed.pathname).toBe('/sharer/sharer.php');
    expect(parsed.searchParams.get('u')).toBe('https://furusato-pizza.jp/share/abc-123');
  });

  it('preserves characters that need URL encoding', () => {
    const url = buildFacebookShareUrl('https://furusato-pizza.jp/share/あいう?k=v&x=1');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('u')).toBe('https://furusato-pizza.jp/share/あいう?k=v&x=1');
  });
});
