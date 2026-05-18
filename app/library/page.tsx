import { LibraryClient } from './_components/LibraryClient';

export const metadata = {
  title: 'ピザ帳 - Make Local Pizza Recipe Agent',
};

export default function LibraryPage() {
  return (
    <main aria-label="ピザ帳 (保存済みレシピ一覧)">
      <LibraryClient />
    </main>
  );
}
