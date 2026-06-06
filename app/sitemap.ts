/**
 * sitemap.xml — 検索エンジン向けに公開対象ページの一覧を提供する。
 *
 * Next.js App Router の標準機能で `/sitemap.xml` として自動配信される。
 *
 * 公開対象 (= 検索インデックス推奨):
 *   - `/`            TOP / ブランドキャッチ
 *   - `/equipment`   機材ガイド LP (ENRO 電気ピザ窯)
 *   - `/local`       地元選択画面 (Tap 1)
 *   - `/ingredients` 食材選択画面 (Tap 2)
 *
 * 非公開 (= サイトマップから除外、robots.ts で disallow):
 *   - `/library` / `/journal`         認証必須・本人専用画面
 *   - `/recipes/[id]` / `/feedback/[id]` / `/candidates/[id]`
 *                                     動的かつセッション/ユーザ固有
 *   - `/api/*`                        API エンドポイント
 *
 * 本番ドメイン (furusato-pizza.jp) は `NEXT_PUBLIC_APP_URL` で設定。
 * 環境変数未設定の dev では `https://furusato-pizza.jp` がフォールバック。
 */

import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://furusato-pizza.jp';

export default function sitemap(): MetadataRoute.Sitemap {
  // lastModified は静的にビルド時刻 (= デプロイ時刻) を使う。動的更新は将来 Issue
  // (#3 share, #4 profile 等で個別ページが増える際に動的生成へ拡張する余地あり)。
  const lastModified = new Date();

  return [
    {
      url: `${BASE_URL}/`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/equipment`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/local`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/ingredients`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];
}
