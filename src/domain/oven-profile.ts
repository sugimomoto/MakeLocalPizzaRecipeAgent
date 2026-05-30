/**
 * 機材プロファイル (オーブン種別) ドメイン型。
 *
 * Slice 8 で導入。レシピ生成プロンプトに「どの機材で焼く前提か」を
 * 載せるための識別子。フロント表示 (BottomSheet / Header 副題 / バッジ) と
 * バックエンドプロンプト (agent/.../oven_profile.py) で同じ ID 体系を共有する。
 *
 * - `enro_450c_90s` がデフォルト (推奨機材: ENRO 電気ピザ窯)
 * - `home_oven_280c_10m` は補足プロファイル (250〜300℃ の家庭用オーブン)
 */

export type OvenProfileId = 'enro_450c_90s' | 'home_oven_280c_10m';

export type OvenProfile = {
  id: OvenProfileId;
  /** 日本語表示名 (mincho 想定) */
  jp: string;
  /** モノ表記 (英・スペック行用) */
  en: string;
  /** 絵文字 (UI アイコンとして恒常的に使う) */
  emoji: '🔥' | '🍳';
  /** 推奨温度の人間向け表現。LLM プロンプトと UI 表示の両方で利用 */
  tempLine: string;
  /** 推奨焼成時間の人間向け表現 */
  timeLine: string;
  /** BottomSheet 等で出す 1〜2 行の説明 */
  desc: string;
  /** デフォルト (= 推奨) プロファイルかどうか */
  recommended: boolean;
};

export const OVEN_PROFILES: Record<OvenProfileId, OvenProfile> = {
  enro_450c_90s: {
    id: 'enro_450c_90s',
    jp: 'ENRO 電気ピザ窯',
    en: 'ENRO · 400°C · 90s',
    emoji: '🔥',
    tempLine: '400〜450°C',
    timeLine: '90〜120 秒',
    desc: '本アプリ推奨。短時間高温で店レベルのナポリ寄り仕上がり。',
    recommended: true,
  },
  home_oven_280c_10m: {
    id: 'home_oven_280c_10m',
    jp: '家庭用オーブン',
    en: 'HOME OVEN · 280°C · 10m',
    emoji: '🍳',
    tempLine: '250〜300°C',
    timeLine: '8〜15 分',
    desc: '家庭オーブンに合わせて温度・時間をレシピ側で再生成。',
    recommended: false,
  },
};

export const DEFAULT_OVEN_PROFILE_ID: OvenProfileId = 'enro_450c_90s';

export const OVEN_PROFILE_IDS: readonly OvenProfileId[] = ['enro_450c_90s', 'home_oven_280c_10m'];

export function isOvenProfileId(value: unknown): value is OvenProfileId {
  return typeof value === 'string' && (OVEN_PROFILE_IDS as readonly string[]).includes(value);
}

export function getOvenProfile(id: OvenProfileId): OvenProfile {
  return OVEN_PROFILES[id];
}
