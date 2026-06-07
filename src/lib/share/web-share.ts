/**
 * Web Share API ヘルパ — Slice 10 拡張
 *
 * `navigator.share()` は OS のシェアシートを開く。Instagram (DM) / LINE / メール
 * 等の任意アプリへ転送できる。Mobile (iOS Safari / Android Chrome) で
 * 確実に動くが、デスクトップは対応バラバラ。
 *
 * - 未対応ブラウザでは `canUseWebShare()` が false を返すので、UI 側で出し分け。
 * - `webShare` は失敗 (ユーザキャンセル含む) を resolve せず throw する。
 *   AbortError はキャンセルなのでサイレントに無視する想定。
 */

export type WebShareData = {
  title?: string;
  text?: string;
  url: string;
};

/**
 * Web Share API がこのブラウザで利用可能か。
 * SSR / 非ブラウザ環境では false を返す。
 */
export function canUseWebShare(): boolean {
  if (typeof navigator === 'undefined') return false;
  return typeof navigator.share === 'function';
}

/**
 * OS のシェアシートを開いて URL を転送する。
 * ユーザキャンセル時は AbortError を投げる (呼び出し側でサイレントに握りつぶす想定)。
 */
export async function webShare(data: WebShareData): Promise<void> {
  if (!canUseWebShare()) {
    throw new Error('Web Share API is not available in this browser');
  }
  await navigator.share(data);
}

/**
 * クリップボードへのコピー。Web Share API とは独立。
 * 失敗時は false、成功時は true を返す。
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
