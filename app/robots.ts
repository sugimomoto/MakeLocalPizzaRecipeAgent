/**
 * robots.txt — クローラ向けのアクセス制御 + サイトマップ位置の通知。
 *
 * Next.js App Router の標準機能で `/robots.txt` として自動配信される。
 *
 * 方針:
 *   - 公開 LP / Quick Tap 入り口 (TOP / equipment / local / ingredients) は許可
 *   - 認証画面 (library / journal) と動的画面 (recipes / feedback / candidates) は
 *     インデックス不要 → disallow で軽くガード (本質的には Firestore Rules で守られている)
 *   - API エンドポイントは検索対象外 → disallow
 *
 * 本番ドメイン (furusato-pizza.jp) は `NEXT_PUBLIC_APP_URL` で設定。
 */

import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://furusato-pizza.jp';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/equipment', '/local', '/ingredients'],
        disallow: [
          // 認証必須・本人専用
          '/library',
          '/journal',
          // 動的・ユーザ/セッション固有
          '/recipes/',
          '/feedback/',
          '/candidates/',
          // API
          '/api/',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
