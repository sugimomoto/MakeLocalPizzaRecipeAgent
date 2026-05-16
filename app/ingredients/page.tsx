import { IngredientSelectClient } from './_components/IngredientSelectClient';

export const metadata = {
  title: '食材を選ぶ - Make Local Pizza Recipe Agent',
};

export default function IngredientsSelectPage() {
  return (
    <main
      style={{
        maxWidth: 980,
        margin: '0 auto',
        padding: '32px 20px 48px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      <header>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>食材を選ぶ</h1>
        <p style={{ color: 'var(--mlpr-sumi-soft)', fontSize: 14, margin: 0 }}>
          選んだ地元の旬を中心に、ピザにしたい食材をタップ。複数選択 OK。
        </p>
      </header>
      <IngredientSelectClient />
    </main>
  );
}
