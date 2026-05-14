import { JetBrains_Mono, Shippori_Mincho_B1, Zen_Kaku_Gothic_New } from 'next/font/google';

import type { ReactNode } from 'react';

import './globals.css';

const shipporiMincho = Shippori_Mincho_B1({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--mlpr-font-mincho',
  preload: true,
});

const zenKakuGothic = Zen_Kaku_Gothic_New({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--mlpr-font-gothic',
  preload: true,
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
