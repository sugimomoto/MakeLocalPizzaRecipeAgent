/**
 * Locale (地元) ドメイン型。
 *
 * - LocaleId は "miyagi" や "miyagi-sendai" のような kebab-case 文字列
 * - Region は日本の 8 地方区分
 * - City は MVP では空配列を許容 (都道府県単位の地元提案)
 */

export type LocaleId = string;

export type Region =
  | 'hokkaido'
  | 'tohoku'
  | 'kanto'
  | 'chubu'
  | 'kinki'
  | 'chugoku'
  | 'shikoku'
  | 'kyushu-okinawa';

export type City = {
  id: string;
  name: string;
};

export type Locale = {
  id: LocaleId;
  prefecture: string;
  prefectureCode: string;
  region: Region;
  cities?: City[];
};

export const REGIONS: readonly Region[] = [
  'hokkaido',
  'tohoku',
  'kanto',
  'chubu',
  'kinki',
  'chugoku',
  'shikoku',
  'kyushu-okinawa',
] as const;

export function isRegion(value: unknown): value is Region {
  return typeof value === 'string' && (REGIONS as readonly string[]).includes(value);
}
