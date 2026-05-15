/**
 * withAuthOptional — 認証情報を解決してからハンドラを呼び出すラッパ。
 *
 * Slice 1 では認証なし: リクエストヘッダ x-mlpr-guest-session-id があればそれを
 * AuthSubject.guestSessionId に詰めて渡し、無ければ匿名 (subject なし) として扱う。
 *
 * Slice 4 で Firebase Auth の ID トークンを検証して userId を入れる差し替え予定。
 * その時に **API シグネチャを変えずに済む** ように、今のうちに型を確定させておく。
 */

import { withErrorHandler } from './error';

export const GUEST_SESSION_HEADER = 'x-mlpr-guest-session-id';

export type AuthSubject = { kind: 'guest'; guestSessionId: string } | { kind: 'anonymous' };

export type AuthedRequestContext = {
  subject: AuthSubject;
};

export type AuthedHandler<T = Response> = (
  request: Request,
  context: AuthedRequestContext,
) => Promise<T>;

/**
 * リクエストヘッダから AuthSubject を解決する。Slice 1 ではゲスト ID ヘッダのみ。
 * 公開関数として export して、テストやサービスレイヤから単体で再利用できるようにしておく。
 */
export function resolveAuthSubject(request: Request): AuthSubject {
  const guestId = request.headers.get(GUEST_SESSION_HEADER);
  if (guestId && guestId.trim().length > 0) {
    return { kind: 'guest', guestSessionId: guestId.trim() };
  }
  return { kind: 'anonymous' };
}

/**
 * route handler を AuthSubject 解決 + 統一エラーハンドラ付きでラップ。
 * Slice 1 では「拒否しない (常に通す)」のがポイント — 雛形として API 形だけ揃える。
 */
export function withAuthOptional(handler: AuthedHandler): (request: Request) => Promise<Response> {
  return withErrorHandler(async (request: Request) => {
    const subject = resolveAuthSubject(request);
    return handler(request, { subject });
  });
}
