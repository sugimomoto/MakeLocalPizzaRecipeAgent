import { TopClient } from './_components/TopClient';

export const metadata = {
  title: 'Make Local Pizza Recipe Agent',
  description: '地元の食材と季節から、AI があなただけのピザを 3 案提案。',
};

export default function HomePage() {
  return (
    <main aria-label="ホーム">
      <TopClient />
    </main>
  );
}
