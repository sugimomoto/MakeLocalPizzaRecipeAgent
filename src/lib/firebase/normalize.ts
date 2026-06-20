/**
 * Firestore 読み出し時の値正規化ヘルパ。
 *
 * Firestore の `Timestamp` / `serverTimestamp()` 反映前の値 / 既に Date のケースを
 * JS Date に揃える処理は saved-recipe.ts / feedback.ts で重複・かつ判定スタイルが
 * バラついていた (`instanceof Timestamp` と duck-typed `'toDate' in`)。両者を包含する
 * 単一実装に集約する。
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Firestore の時刻値を Date に正規化する。
 *
 * - `Timestamp` インスタンス → `toDate()`
 * - 既に `Date` → そのまま
 * - `toDate()` を持つオブジェクト (SDK コピー差異やモックで instanceof が効かない場合の
 *   duck-typing) → `toDate()`
 * - それ以外 (未着 = serverTimestamp 反映前など) → `fallback`
 */
export function timestampToDate(value: unknown, fallback: Date): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (
    value !== null &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return fallback;
}
