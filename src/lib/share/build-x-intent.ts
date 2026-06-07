/**
 * X (Twitter) Web Intent URL builder — Slice 10
 *
 * https://x.com/intent/post?text=...&url=...
 * - text と url は URLEncode
 * - text 部分は X 仕様 280 字内 (URL は t.co で 23 字に短縮) を超えないよう
 *   title 40 字 / headline 80 字でクライアント側で truncate
 * - 改行は `\n`、ハッシュタグは固定 "#ふるさとピザ帳 #地元ピザ"
 *
 * 単体テスト: `build-x-intent.test.ts`
 */

const HASHTAGS = '#ふるさとピザ帳 #地元ピザ';
const TITLE_MAX = 40;
const HEADLINE_MAX = 80;

/** 末尾を ellipsis (…) で切り詰める。`max` は ellipsis を含む全長。 */
export function truncateForShare(s: string, max: number): string {
  const trimmed = (s ?? '').trim();
  if (trimmed.length <= max) return trimmed;
  if (max <= 1) return trimmed.slice(0, max);
  return trimmed.slice(0, max - 1) + '…';
}

/**
 * 投稿テキスト本文を組み立てる (URL は付けない)。
 * テストと再利用を考慮して関数を分けてある。
 */
export function buildShareText(args: { title: string; storyHeadline: string }): string {
  const lines: string[] = [];
  const title = truncateForShare(args.title, TITLE_MAX);
  if (title) lines.push(`🍕 ${title}`);

  const headline = truncateForShare(args.storyHeadline ?? '', HEADLINE_MAX);
  if (headline) lines.push(headline);

  lines.push(HASHTAGS);
  return lines.join('\n');
}

/**
 * X Web Intent の遷移先 URL を組み立てる。
 *
 * @example
 *   const intent = buildXIntentUrl({
 *     title: '...',
 *     storyHeadline: '...',
 *     shareUrl: 'https://furusato-pizza.jp/share/abc',
 *   });
 *   window.open(intent, '_blank', 'noopener,noreferrer');
 */
export function buildXIntentUrl(args: {
  title: string;
  storyHeadline: string;
  shareUrl: string;
}): string {
  const text = buildShareText({ title: args.title, storyHeadline: args.storyHeadline });
  const params = new URLSearchParams({ text, url: args.shareUrl });
  return `https://x.com/intent/post?${params.toString()}`;
}
