import { JetBrains_Mono, Shippori_Mincho_B1, Zen_Kaku_Gothic_New } from 'next/font/google';

import type { ReactNode } from 'react';

import './globals.css';

// 日本語 Google Fonts は subset 数が膨大 (漢字を細分割) で preload を全 subset 分発行すると
// 数百〜数千の woff2 link を生成してハイドレーションが詰まる。
// 必要な weight のみ + preload: false で lazy load させる (display: 'swap' で system font 即表示)。

const shipporiMincho = Shippori_Mincho_B1({
  weight: ['400', '600'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--mlpr-font-mincho',
  preload: false,
});

const zenKakuGothic = Zen_Kaku_Gothic_New({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--mlpr-font-gothic',
  preload: false,
});

const jetBrainsMono = JetBrains_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--mlpr-font-mono',
  preload: false,
});

export const metadata = {
  title: 'Make Local Pizza Recipe Agent',
  description: 'ローカル/旬の食材を活かしたピザレシピを提案する AI エージェント',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const fontClasses = [
    shipporiMincho.variable,
    zenKakuGothic.variable,
    jetBrainsMono.variable,
  ].join(' ');

  return (
    <html lang="ja" className={fontClasses}>
      <body className="mlpr-washi-noise mlpr-washi-noise--canvas">{children}</body>
    </html>
  );
}
