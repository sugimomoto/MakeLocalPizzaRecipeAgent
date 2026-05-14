import type { CSSProperties, ReactNode } from 'react';

type Tone = 'canvas' | 'soft' | 'deep';

type WashiTextureProps = {
  tone?: Tone;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

const toneClass: Record<Tone, string> = {
  canvas: 'mlpr-washi-noise--canvas',
  soft: 'mlpr-washi-noise--soft',
  deep: 'mlpr-washi-noise--deep',
};

/**
 * 和紙背景を提供するラッパー。
 * src/styles/washi-noise.css のクラスを React コンポーネント化したもの。
 *
 * 元: design/pizza-tokens.jsx の Washi コンポーネント
 */
export function WashiTexture({ tone = 'canvas', className, style, children }: WashiTextureProps) {
  const classes = ['mlpr-washi-noise', toneClass[tone], className].filter(Boolean).join(' ');
  return (
    <div className={classes} style={style}>
      {children}
    </div>
  );
}
