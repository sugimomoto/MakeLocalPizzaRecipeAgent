import { FeedbackClient } from './_components/FeedbackClient';

export const metadata = {
  title: 'フィードバック',
};

type PageProps = {
  params: Promise<{ candidateId: string }>;
};

export default async function FeedbackPage({ params }: PageProps) {
  const { candidateId } = await params;
  return (
    <main style={{ padding: 0 }}>
      <FeedbackClient candidateId={candidateId} />
    </main>
  );
}
