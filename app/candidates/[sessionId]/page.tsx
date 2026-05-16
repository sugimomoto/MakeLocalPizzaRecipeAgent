import { CandidatesClient } from './_components/CandidatesClient';

export const metadata = {
  title: '候補 3 案 - Make Local Pizza Recipe Agent',
};

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function CandidatesPage({ params }: PageProps) {
  const { sessionId } = await params;
  return (
    <main
      style={{
        maxWidth: 1080,
        margin: '0 auto',
        padding: '32px 20px 48px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      <header>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>3 つの候補</h1>
        <p style={{ color: 'var(--mlpr-sumi-soft)', fontSize: 14, margin: 0 }}>
          王道 / 一歩外す / 大冒険 — 戦略軸の異なる 3 案を順次焼き上げます。
        </p>
      </header>
      <CandidatesClient sessionId={sessionId} />
    </main>
  );
}
