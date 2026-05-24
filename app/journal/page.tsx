import { JournalClient } from './_components/JournalClient';

export const metadata = {
  title: '振り返り帳',
};

export default function JournalPage() {
  return (
    <main aria-label="振り返り帳 (作った 1 枚たち)">
      <JournalClient />
    </main>
  );
}
