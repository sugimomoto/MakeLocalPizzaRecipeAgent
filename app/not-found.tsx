import Link from 'next/link';

export const metadata = {
  title: '404 - Make Local Pizza Recipe Agent',
};

export default function NotFound() {
  return (
    <main
      style={{
        maxWidth: 560,
        margin: '0 auto',
        padding: '64px 20px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <p
        style={{ fontFamily: 'var(--mlpr-font-mono)', color: 'var(--mlpr-sumi-muted)', margin: 0 }}
      >
        404
      </p>
      <h1 style={{ fontSize: 28, margin: 0 }}>このページは焼き上がりませんでした</h1>
      <p style={{ color: 'var(--mlpr-sumi-soft)', margin: 0 }}>
        URL を確認するか、最初からやり直してください。
      </p>
      <p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '10px 22px',
            borderRadius: 12,
            background: 'var(--mlpr-shu)',
            color: 'var(--mlpr-kinari)',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          トップへ戻る
        </Link>
      </p>
    </main>
  );
}
