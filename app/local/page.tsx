import { LocalSelectClient } from './_components/LocalSelectClient';

export const metadata = {
  title: '地元を選ぶ - Make Local Pizza Recipe Agent',
};

export default function LocalSelectPage() {
  return (
    <main style={{ padding: '12px 0 32px' }}>
      <LocalSelectClient />
    </main>
  );
}
