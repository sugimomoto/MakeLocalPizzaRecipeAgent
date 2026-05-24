import { LibraryClient } from './_components/LibraryClient';

export const metadata = {
  title: '保存帳',
};

export default function LibraryPage() {
  return (
    <main aria-label="ピザ帳 (保存済みレシピ一覧)">
      <LibraryClient />
    </main>
  );
}
