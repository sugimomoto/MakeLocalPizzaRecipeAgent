/**
 * getPathParam — Request の URL パスから index 番目のセグメントを取り出す。
 *
 * Route Handler 内で `new URL(request.url).pathname.split('/').filter(Boolean)[i]` を
 * 手書きしていた箇所 (recipes/[candidateId] / reroll / locales/[id]/ingredients) の共通化。
 *
 * 例: `/api/recipes/c1` → getPathParam(request, 2) === 'c1'
 *     `/api/quicktap/sessions/s1/reroll` → getPathParam(request, 3) === 's1'
 *
 * セグメントが存在しない場合は null を返す (呼び出し側で 400 などに変換する)。
 */
export function getPathParam(request: Request, index: number): string | null {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  return segments[index] ?? null;
}
