import { DetailClient } from './_components/DetailClient';

export const metadata = {
  title: '詳細レシピ',
};

type PageProps = {
  params: Promise<{ candidateId: string }>;
};

export default async function RecipeDetailPage({ params }: PageProps) {
  const { candidateId } = await params;
  return (
    <main style={{ padding: 0 }}>
      <DetailClient candidateId={candidateId} />
    </main>
  );
}
