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
    <main style={{ padding: '12px 0 0' }}>
      <CandidatesClient sessionId={sessionId} />
    </main>
  );
}
