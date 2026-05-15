/**
 * 共通 HTTP エラー型 + ハンドラ。
 *
 * - レスポンス形式は { error: { code, message } } で統一
 * - サーバ側 ApiError → JSON Response へ変換するヘルパ
 * - クライアント側で fetch 結果を扱うときも同じ shape を期待できる
 *
 * Slice 1 では BFF 側 (route.ts) で投げられる ApiError を共通フォーマットに整える役割。
 */

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  toBody(): ApiErrorBody {
    return { error: { code: this.code, message: this.message } };
  }
}

/** 良く使う 4xx/5xx を生成するファクトリ群。 */
export const apiError = {
  badRequest: (code: string, message: string): ApiError => new ApiError(400, code, message),
  unauthorized: (code: string, message: string): ApiError => new ApiError(401, code, message),
  forbidden: (code: string, message: string): ApiError => new ApiError(403, code, message),
  notFound: (code: string, message: string): ApiError => new ApiError(404, code, message),
  conflict: (code: string, message: string): ApiError => new ApiError(409, code, message),
  unprocessable: (code: string, message: string): ApiError => new ApiError(422, code, message),
  internal: (code: string, message: string): ApiError => new ApiError(500, code, message),
};

/**
 * route handler の catch から呼ぶ。ApiError なら status 維持、
 * それ以外は internal にフォールバック。
 */
export function toErrorResponse(error: unknown): Response {
  const apiErr = isApiError(error)
    ? error
    : new ApiError(500, 'INTERNAL_ERROR', 'unexpected internal error');

  return new Response(JSON.stringify(apiErr.toBody()), {
    status: apiErr.status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/**
 * route handler を ApiError ハンドリング付きでラップする小さなヘルパ。
 * 使い方:
 *   export const POST = withErrorHandler(async (req) => { ... });
 */
export function withErrorHandler<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response>,
): (...args: TArgs) => Promise<Response> {
  return async (...args: TArgs) => {
    try {
      return await handler(...args);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
