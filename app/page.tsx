import { TopClient } from './_components/TopClient';

export const metadata = {
  // layout.tsx の template ('%s · ふるさとピザ帳') を上書き (TOP は単独ブランド名のみ)
  title: { absolute: 'ふるさとピザ帳' },
  description: '地元の食材と季節から、AI があなただけのピザを 3 案提案。',
};

export default function HomePage() {
  return (
    <main aria-label="ホーム">
      <TopClient />
    </main>
  );
}
