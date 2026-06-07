/**
 * /share/[shareId] — 公開共有レシピページ (Slice 10)
 *
 * - Server Component (認証不要・public read)
 * - Admin SDK で Firestore `shared_recipes/{shareId}` を読み出す
 * - `generateMetadata` で OGP + Twitter Card を動的設定
 * - 存在しなければ Next.js の `notFound()` で 404
 *
 * NOTE: build 時には params が確定しないので自動で動的レンダリング。
 *       Firestore 読み出しは Node.js runtime 必須 (firebase-admin SDK)。
 */
import { notFound } from 'next/navigation';

import { getAdminFirestore } from '@/lib/firebase/admin';
import { getSharedRecipe } from '@/lib/firebase/shared-recipe';

import { SharePageAnalytics } from './_components/SharePageAnalytics';
import { SharePageView } from './_components/SharePageView';

import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://furusato-pizza.jp';

export const runtime = 'nodejs';

type Params = { shareId: string };

async function fetchSnapshot(shareId: string) {
  try {
    const adminDb = getAdminFirestore();
    return await getSharedRecipe(adminDb, shareId);
  } catch {
    // Admin SDK 初期化失敗 (= dev / ADC 無) は 404 と同等に扱う
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { shareId } = await params;
  const snapshot = await fetchSnapshot(shareId);
  if (!snapshot) {
    return {
      title: '見つかりませんでした',
      robots: { index: false, follow: false },
    };
  }

  const title = `${snapshot.title} — ふるさとピザ帳`;
  const description =
    snapshot.story.headline || snapshot.concept || `${snapshot.prefecture}の食材で 1 枚。`;
  const ogImage = snapshot.imageUrl;
  const url = `${BASE_URL}/share/${shareId}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'ふるさとピザ帳',
      images: ogImage ? [{ url: ogImage, width: 1024, height: 1024 }] : [],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : [],
    },
  };
}

export default async function SharedRecipePage({ params }: { params: Promise<Params> }) {
  const { shareId } = await params;
  const snapshot = await fetchSnapshot(shareId);
  if (!snapshot) notFound();

  return (
    <>
      <SharePageView snapshot={snapshot} />
      <SharePageAnalytics
        shareId={shareId}
        prefecture={snapshot.prefecture}
        strategy={snapshot.strategy}
      />
    </>
  );
}
