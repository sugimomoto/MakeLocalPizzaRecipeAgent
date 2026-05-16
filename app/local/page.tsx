import { LocalSelectClient } from './_components/LocalSelectClient';

export const metadata = {
  title: '地元を選ぶ - Make Local Pizza Recipe Agent',
};

export default function LocalSelectPage() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '32px 20px 48px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      <header>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>地元を選ぶ</h1>
        <p style={{ color: 'var(--mlpr-sumi-soft)', fontSize: 14, margin: 0 }}>
          馴染みのある県を 1 つ選んでください。次回以降は自動で食材選択に進みます。
        </p>
      </header>
      <LocalSelectClient />
    </main>
  );
}
