import { IngredientSelectClient } from './_components/IngredientSelectClient';

export const metadata = {
  title: '食材を選ぶ - Make Local Pizza Recipe Agent',
};

export default function IngredientsSelectPage() {
  return (
    <main style={{ padding: '12px 0 0' }}>
      <IngredientSelectClient />
    </main>
  );
}
