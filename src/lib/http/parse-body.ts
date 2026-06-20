/**
 * parseJsonBody — Request の JSON ボディを読み取り Zod スキーマで検証する共通ヘルパ。
 *
 * Route Handler で重複していた「try/catch で request.json() → safeParse → エラー整形」
 * (quicktap/sessions / recipes/[id] / share) を共通化する。
 *
 * デフォルトの挙動は最も多いパターン (quicktap/sessions・recipes) に合わせる:
 *   - JSON parse 失敗 → 400 BAD_BODY 'request body must be valid JSON'
 *   - Zod 検証失敗   → 400 BAD_BODY (issues の message を '; ' 連結)
 *
 * share のようにコード/メッセージが異なるルートは opts で上書きできる
 * (互換性のため既存のレスポンス形式を保つ)。
 *
 * 注意: reroll は 1 つの try で path/body をまとめて検証し BAD_REQUEST を返す別構造の
 * ため、本ヘルパには寄せていない (挙動を変えないことを優先)。
 */

import { apiError } from './error';

import type { z } from 'zod';

export type ParseJsonBodyOptions = {
  /** エラーコード (default 'BAD_BODY') */
  code?: string;
  /** JSON parse 失敗時のメッセージ (default 'request body must be valid JSON') */
  invalidJsonMessage?: string;
  /** Zod 検証失敗時のメッセージ整形 (default: issues の message を '; ' 連結) */
  formatZodError?: (error: z.ZodError) => string;
};

export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  opts: ParseJsonBodyOptions = {},
): Promise<T> {
  const code = opts.code ?? 'BAD_BODY';
  const invalidJsonMessage = opts.invalidJsonMessage ?? 'request body must be valid JSON';
  const formatZodError =
    opts.formatZodError ?? ((error) => error.issues.map((i) => i.message).join('; '));

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw apiError.badRequest(code, invalidJsonMessage);
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw apiError.badRequest(code, formatZodError(parsed.error));
  }
  return parsed.data;
}
