import type { ReactNode } from 'react';

/**
 * Slice 1: 最小レイアウトのスタブ。
 * フォント (Shippori Mincho / Zen Kaku Gothic / JetBrains Mono) 読み込みと
 * 和紙背景は T-023 / T-024 で導入する。
 */
export const metadata = {
  title: 'Make Local Pizza Recipe Agent',
  description: 'ローカル/旬の食材を活かしたピザレシピを提案する AI エージェント',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
