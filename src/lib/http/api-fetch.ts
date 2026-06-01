'use client';

/**
 * apiFetch — 内部 API を叩く client-side fetch のラッパ (Slice 9.1)
 *
 * 必須のヘッダを毎回手書きする重複を解消するためのヘルパ:
 *
 *   - `content-type: application/json` をデフォルト付与 (POST/PUT 等)
 *   - **`x-mlpr-guest-session-id: <永続化された UUID>` を自動付与**
 *     (Slice 9 のレートリミット key を IP fallback ではなく guest 単位にするため)
 *
 * 使用箇所: `useQuickTapStream` / `useRecipeDetailStream` / reroll など、
 * client から `/api/...` を叩くすべての fetch。
 *
 * NOTE: server-side では呼ばないこと (`getOrCreateGuestSessionId` が
 *       localStorage に依存し、SSR では新しい一時 ID を返してしまうため)。
 */

import { getOrCreateGuestSessionId } from '@/lib/localstorage/guest-session';

import { GUEST_SESSION_HEADER } from './with-auth';

export type ApiFetchInit = Omit<RequestInit, 'headers'> & {
  /** 任意の追加ヘッダ。content-type / guest session id は自動付与される */
  headers?: Record<string, string>;
  /** body が JSON.stringify 済の文字列でない場合に true を指定 (デフォルト false = JSON 想定) */
  rawBody?: boolean;
};

/**
 * 内部 API を叩く fetch ラッパ。
 *
 * - body は `string` (JSON.stringify 済) もしくは undefined を想定。
 *   オブジェクトを直接渡したい場合は呼び出し側で JSON.stringify する。
 * - `signal` / `method` 等は init から透過的に転送。
 */
export function apiFetch(url: string, init: ApiFetchInit = {}): Promise<Response> {
  const { headers: extraHeaders = {}, rawBody: _rawBody, ...rest } = init;
  // _rawBody は将来の拡張用 (現状未使用)
  void _rawBody;

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    [GUEST_SESSION_HEADER]: getOrCreateGuestSessionId(),
    ...extraHeaders,
  };

  return fetch(url, { ...rest, headers });
}
