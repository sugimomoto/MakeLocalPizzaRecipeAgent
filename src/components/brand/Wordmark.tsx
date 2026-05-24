/**
 * Wordmark — 「ふるさとピザ帳」 の文字組 (Slice 7)
 *
 * 設計: [`design/pizza-tokens.jsx`](design/pizza-tokens.jsx) Wordmark @ L394
 * 3 種 (horizontal / stacked / vertical)。dark トグルでダーク背景対応。
 */

import type { JSX } from 'react';

const C = {
  shu: '#C8412A',
  sumi: '#1F1A12',
  sumiMuted: '#928571',
  kinari: '#FBF7ED',
} as const;

const MINCHO_STACK = "'Shippori Mincho B1', 'Hiragino Mincho ProN', 'Yu Mincho', serif";
const MONO_STACK = "'JetBrains Mono', ui-monospace, monospace";

export type WordmarkKind = 'horizontal' | 'stacked' | 'vertical';

export type WordmarkProps = {
  kind?: WordmarkKind;
  /** ダーク背景時の反転 */
  dark?: boolean;
  /** 全体スケーリング (1 = base) */
  size?: number;
};

export function Wordmark({
  kind = 'horizontal',
  dark = false,
  size = 1,
}: WordmarkProps): JSX.Element {
  const ink = dark ? C.kinari : C.sumi;
  const sub = dark ? 'rgba(251, 247, 237, 0.6)' : C.sumiMuted;
  const accent = C.shu;

  if (kind === 'vertical') {
    return (
      <div
        style={{
          writingMode: 'vertical-rl',
          fontFamily: MINCHO_STACK,
          fontWeight: 600,
          fontSize: 22 * size,
          color: ink,
          letterSpacing: 8 * size,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6 * size,
        }}
      >
        <span
          style={{
            color: accent,
            fontFamily: MONO_STACK,
            fontSize: 9 * size,
            letterSpacing: 4 * size,
            writingMode: 'vertical-rl',
          }}
        >
          FURUSATO
        </span>
        <span>ふるさとピザ帳</span>
      </div>
    );
  }

  if (kind === 'stacked') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: MONO_STACK,
            fontSize: 10 * size,
            color: accent,
            letterSpacing: 6 * size,
          }}
        >
          FURUSATO PIZZA-CHŌ
        </div>
        <div
          style={{
            fontFamily: MINCHO_STACK,
            fontSize: 22 * size,
            fontWeight: 600,
            color: ink,
            letterSpacing: 3 * size,
            marginTop: 4 * size,
          }}
        >
          ふるさとピザ帳
        </div>
      </div>
    );
  }

  // horizontal
  return (
    <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 * size }}>
      <span
        style={{
          fontFamily: MINCHO_STACK,
          fontSize: 20 * size,
          fontWeight: 600,
          color: ink,
          letterSpacing: 2 * size,
        }}
      >
        ふるさとピザ帳
      </span>
      <span
        style={{
          fontFamily: MONO_STACK,
          fontSize: 9 * size,
          color: sub,
          letterSpacing: 3 * size,
        }}
      >
        FURUSATO PIZZA-CHŌ
      </span>
    </div>
  );
}
