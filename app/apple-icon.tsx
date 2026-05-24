import { ImageResponse } from 'next/og';

/**
 * apple-icon (iOS ホームスクリーン用 180x180 PNG)
 *
 * Next.js App Router の規約: `app/apple-icon.tsx` を export すると build 時に
 * 静的 PNG として materialize される。ImageResponse は satori を内部で使うが、
 * SVG の foreignObject 等は使えないので、純粋な div/span ベースで構成する。
 *
 * 変型 B (円窓ピザ + 和印「ふ」) を再現する形 — 単純化のため和紙背景 + 朱の丸印 +
 * 「ふ」 で代用 (satori の SVG ネストはレイアウト精度が低いため)。
 */

export const runtime = 'nodejs';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: 180,
        height: 180,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FBF7ED',
      }}
    >
      <div
        style={{
          width: 156,
          height: 156,
          borderRadius: 78,
          background: '#C8412A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FBF7ED',
          fontSize: 108,
          fontWeight: 700,
          // ImageResponse は font 未指定だと sans-serif にフォールバックする
          fontFamily: '"Hiragino Mincho ProN", "Yu Mincho", serif',
        }}
      >
        ふ
      </div>
    </div>,
    size,
  );
}
