/**
 * FurusatoMark — 「ふるさとピザ帳」 ブランドマーク (Slice 7)
 *
 * 設計: [`design/pizza-tokens.jsx`](design/pizza-tokens.jsx) MarkA〜D + FurusatoMark @ L271-391
 * 採用案: 変型 B (円窓ピザ + 和印「ふ」)。16px 以下は自動で variant A にフォールバック。
 *
 * 色値は CSS 変数 (--mlpr-shu / --mlpr-kinari) と一致させてあるが、SVG 内部は
 * fill 属性に直接 hex を入れる (SVG の CSS 変数解決はランタイムで揺れるため)。
 */

import type { JSX } from 'react';

// Tokens (= --mlpr-* CSS 変数と同期)
const C = {
  shu: '#C8412A',
  shuDeep: '#9F3220',
  kinari: '#FBF7ED',
  sumi: '#1F1A12',
} as const;

// Pizza-only palette (MarkB の中身用、ブランド全体トークンには昇格させない)
const PIZZA_PAL = {
  crust: '#E2A35F',
  crustEdge: '#B36A2B',
  sauce: '#A8331C',
  cheese: '#F4C944',
  cheeseHi: '#FBE08A',
  pepp: '#D44A2A',
  peppDark: '#A33218',
  basil: '#5B7C3A',
} as const;

const MINCHO_STACK = "'Shippori Mincho B1', 'Hiragino Mincho ProN', 'Yu Mincho', serif";

export type MarkVariant = 'A' | 'B' | 'C' | 'D';

export type FurusatoMarkProps = {
  /** A=和印のみ / B=円窓ピザ+和印 (デフォルト) / C=帳印縦組 / D=一切れ印 */
  variant?: MarkVariant;
  /** px。size <= 18 のとき variant 未指定なら自動で A にフォールバック */
  size?: number;
  /** Dark surface 用反転 (MarkA のみ対応) */
  dark?: boolean;
  /** title 属性として渡す aria-label の上書き */
  label?: string;
};

/**
 * 変型 A · 和印「ふ」 — 円形朱印に明朝の「ふ」。≤16px のファビコン用。
 */
function MarkA({ size, dark, label }: { size: number; dark: boolean; label: string }): JSX.Element {
  const fill = dark ? C.kinari : C.shu;
  const text = dark ? C.shu : C.kinari;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={label}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="50" r="46" fill={fill} />
      <circle cx="50" cy="50" r="46" fill="none" stroke={text} strokeWidth="0.6" opacity="0.4" />
      <circle cx="50" cy="50" r="42" fill="none" stroke={text} strokeWidth="0.5" opacity="0.65" />
      <text
        x="50"
        y="68"
        textAnchor="middle"
        fontFamily={MINCHO_STACK}
        fontWeight="600"
        fontSize="56"
        fill={text}
      >
        ふ
      </text>
      <circle cx="78" cy="78" r="3.4" fill={text} opacity="0.85" />
    </svg>
  );
}

/**
 * 変型 B · 円窓ピザ + 和印 — 採用ブランドマーク。
 * 六方対称のチーズ + ペパロニ、3 葉のバジル、右下に朱の「ふ」印。
 */
function MarkB({ size, label }: { size: number; label: string }): JSX.Element {
  const P = PIZZA_PAL;
  const cx = 50;
  const cy = 50;
  const peppAngles = [0, 60, 120, 180, 240, 300];
  const basilAngles = [30, 150, 270];
  const peppR = 18;
  const basilR = 27;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={label}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* crust */}
      <circle cx={cx} cy={cy} r="48" fill={P.crust} />
      <circle cx={cx} cy={cy} r="44.5" fill={P.crustEdge} opacity="0.55" />
      {/* sauce ring */}
      <circle cx={cx} cy={cy} r="43" fill={P.sauce} />
      {/* cheese */}
      <circle cx={cx} cy={cy} r="39" fill={P.cheese} />
      {/* cheese highlights */}
      <ellipse
        cx="38"
        cy="36"
        rx="6"
        ry="3.4"
        fill={P.cheeseHi}
        opacity="0.55"
        transform="rotate(-20 38 36)"
      />
      <ellipse
        cx="62"
        cy="42"
        rx="5"
        ry="2.8"
        fill={P.cheeseHi}
        opacity="0.5"
        transform="rotate(25 62 42)"
      />
      <ellipse
        cx="44"
        cy="62"
        rx="5.5"
        ry="3"
        fill={P.cheeseHi}
        opacity="0.5"
        transform="rotate(15 44 62)"
      />
      {/* pepperoni — 六方対称 */}
      {peppAngles.map((deg) => {
        const a = ((deg - 90) * Math.PI) / 180;
        const x = cx + Math.cos(a) * peppR;
        const y = cy + Math.sin(a) * peppR;
        return (
          <g key={`p${deg}`}>
            <circle cx={x} cy={y} r="6.8" fill={P.peppDark} opacity="0.7" />
            <circle cx={x} cy={y} r="6.2" fill={P.pepp} />
            <circle cx={x - 2.0} cy={y - 1.2} r="0.9" fill={P.peppDark} opacity="0.7" />
            <circle cx={x + 1.6} cy={y + 1.8} r="0.7" fill={P.peppDark} opacity="0.6" />
            <circle cx={x + 0.4} cy={y - 2.4} r="0.6" fill={P.peppDark} opacity="0.5" />
          </g>
        );
      })}
      {/* basil leaves */}
      {basilAngles.map((deg) => {
        const a = ((deg - 90) * Math.PI) / 180;
        const x = cx + Math.cos(a) * basilR;
        const y = cy + Math.sin(a) * basilR;
        return (
          <g key={`b${deg}`} transform={`translate(${x} ${y}) rotate(${deg + 90})`}>
            <ellipse cx="0" cy="0" rx="4.2" ry="2.1" fill={P.basil} />
            <line
              x1="-3.5"
              y1="0"
              x2="3.5"
              y2="0"
              stroke="#3F5028"
              strokeWidth="0.4"
              opacity="0.7"
            />
          </g>
        );
      })}
      <g transform="translate(50 50) rotate(45)">
        <ellipse cx="0" cy="0" rx="3" ry="1.5" fill={P.basil} />
      </g>
      {/* 和印「ふ」 stamp at lower-right rim */}
      <ellipse cx="78.5" cy="78.5" rx="11" ry="2.6" fill="rgba(31,26,18,0.22)" />
      <circle cx="78" cy="76" r="11.5" fill={C.shu} />
      <circle
        cx="78"
        cy="76"
        r="11.5"
        fill="none"
        stroke={C.kinari}
        strokeWidth="0.55"
        opacity="0.45"
      />
      <circle
        cx="78"
        cy="76"
        r="9.8"
        fill="none"
        stroke={C.kinari}
        strokeWidth="0.5"
        opacity="0.7"
      />
      <text
        x="78"
        y="80.4"
        textAnchor="middle"
        fontFamily={MINCHO_STACK}
        fontWeight="700"
        fontSize="13.5"
        fill={C.kinari}
      >
        ふ
      </text>
    </svg>
  );
}

/**
 * 変型 C · 帳印 — 正方の朱印に「ふるさと/ピザ帳」を縦 2 列。
 */
function MarkC({ size, label }: { size: number; label: string }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={label}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="6" y="6" width="88" height="88" rx="14" fill={C.shu} />
      <rect
        x="6"
        y="6"
        width="88"
        height="88"
        rx="14"
        fill="none"
        stroke={C.kinari}
        strokeWidth="1.2"
        opacity="0.45"
      />
      <rect
        x="11"
        y="11"
        width="78"
        height="78"
        rx="10"
        fill="none"
        stroke={C.kinari}
        strokeWidth="0.8"
        opacity="0.55"
      />
      <g fontFamily={MINCHO_STACK} fontWeight="600" fill={C.kinari}>
        <text x="65" y="28" textAnchor="middle" fontSize="20">
          ふ
        </text>
        <text x="65" y="50" textAnchor="middle" fontSize="20">
          る
        </text>
        <text x="65" y="72" textAnchor="middle" fontSize="20">
          さ
        </text>
      </g>
      <g fontFamily={MINCHO_STACK} fontWeight="700" fill={C.kinari}>
        <text x="35" y="36" textAnchor="middle" fontSize="22">
          ピ
        </text>
        <text x="35" y="62" textAnchor="middle" fontSize="22">
          ザ
        </text>
        <text x="35" y="88" textAnchor="middle" fontSize="22">
          帳
        </text>
      </g>
    </svg>
  );
}

/**
 * 変型 D · 一切れ印 — ピザ一切れ = ページの角 (栞)。
 */
function MarkD({ size, label }: { size: number; label: string }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={label}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="50" r="47" fill={C.kinari} stroke={C.sumi} strokeWidth="2" />
      <path d="M50 50 L50 6 A44 44 0 0 1 90 38 Z" fill={C.shu} />
      <circle cx="60" cy="22" r="2.5" fill="#F2E5BF" />
      <circle cx="72" cy="30" r="2.2" fill="#F2E5BF" />
      <ellipse cx="66" cy="38" rx="2.8" ry="1.2" fill="#3F5028" transform="rotate(30 66 38)" />
      <path
        d="M50 6 A44 44 0 0 1 90 38"
        fill="none"
        stroke={C.shuDeep}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <text x="38" y="78" fontFamily={MINCHO_STACK} fontWeight="700" fontSize="36" fill={C.sumi}>
        ふ
      </text>
    </svg>
  );
}

/**
 * 「ふるさとピザ帳」 ブランドマーク (公式エントリポイント)。
 *
 * variant 未指定なら `size <= 18` で A、それ以外は B にフォールバック。
 * 採用案は B (円窓ピザ + 和印)。
 */
export function FurusatoMark({
  variant,
  size = 64,
  dark = false,
  label = 'ふるさとピザ帳',
}: FurusatoMarkProps): JSX.Element {
  const v: MarkVariant = variant ?? (size <= 18 ? 'A' : 'B');
  if (v === 'A') return <MarkA size={size} dark={dark} label={label} />;
  if (v === 'C') return <MarkC size={size} label={label} />;
  if (v === 'D') return <MarkD size={size} label={label} />;
  return <MarkB size={size} label={label} />;
}
