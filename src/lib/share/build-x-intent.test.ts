import { describe, expect, it } from 'vitest';

import { buildShareText, buildXIntentUrl, truncateForShare } from './build-x-intent';

describe('truncateForShare', () => {
  it('returns the text unchanged when within max', () => {
    expect(truncateForShare('hello', 5)).toBe('hello');
    expect(truncateForShare('hello', 10)).toBe('hello');
  });

  it('truncates with ellipsis when over max', () => {
    expect(truncateForShare('abcdefghij', 5)).toBe('abcd…');
  });

  it('trims whitespace before measuring', () => {
    expect(truncateForShare('  hi  ', 5)).toBe('hi');
  });

  it('handles empty string', () => {
    expect(truncateForShare('', 5)).toBe('');
    expect(truncateForShare(undefined as unknown as string, 5)).toBe('');
  });

  it('max <= 1 returns hard cut (no ellipsis room)', () => {
    expect(truncateForShare('abc', 1)).toBe('a');
    expect(truncateForShare('abc', 0)).toBe('');
  });
});

describe('buildShareText', () => {
  it('joins emoji + title + headline + hashtags by newline', () => {
    const text = buildShareText({ title: '松島牡蠣の春一枚', storyHeadline: '海の香り。' });
    expect(text).toContain('🍕 松島牡蠣の春一枚');
    expect(text).toContain('海の香り。');
    expect(text).toContain('#ふるさとピザ帳 #地元ピザ');
    expect(text.split('\n').length).toBe(3);
  });

  it('omits headline line when storyHeadline is empty', () => {
    const text = buildShareText({ title: 't', storyHeadline: '' });
    expect(text.split('\n').length).toBe(2);
    expect(text).toBe(['🍕 t', '#ふるさとピザ帳 #地元ピザ'].join('\n'));
  });

  it('truncates very long inputs', () => {
    const long40 = 'あ'.repeat(60);
    const longHeadline = 'い'.repeat(120);
    const text = buildShareText({ title: long40, storyHeadline: longHeadline });
    // 40 字に丸めて末尾 …
    expect(text).toContain('あ'.repeat(39) + '…');
    // 80 字に丸めて末尾 …
    expect(text).toContain('い'.repeat(79) + '…');
  });

  it('total text + url estimated length fits in 280 characters', () => {
    // 文字数の上限境界。title 40 + headline 80 + emoji/space/hashtags + 改行 = ~140 字。
    // 共有 URL は t.co で 23 字相当扱いなので 280 字内に収まる。
    const text = buildShareText({
      title: 'あ'.repeat(40),
      storyHeadline: 'い'.repeat(80),
    });
    expect(text.length).toBeLessThanOrEqual(280 - 23);
  });
});

describe('buildXIntentUrl', () => {
  it('encodes both text and url into query string', () => {
    const url = buildXIntentUrl({
      title: 'タイトル',
      storyHeadline: '一文',
      shareUrl: 'https://furusato-pizza.jp/share/abc',
    });
    expect(url.startsWith('https://x.com/intent/tweet?')).toBe(true);
    const u = new URL(url);
    expect(u.searchParams.get('url')).toBe('https://furusato-pizza.jp/share/abc');
    const text = u.searchParams.get('text') ?? '';
    expect(text).toContain('タイトル');
    expect(text).toContain('一文');
  });
});
