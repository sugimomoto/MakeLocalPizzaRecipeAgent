import Link from 'next/link';

/**
 * /privacy — プライバシーポリシー (GA4 導入に伴う最小ページ)。
 *
 * - 認証不要・静的ページ (Server Component)
 * - 個人開発の透明性開示用。専門的な法的レビューを経たものではなく、
 *   GA4・楽天アフィリエイト・Firebase Auth の利用範囲を平易に説明する。
 * - footer / 関連画面からリンクされる。robots.ts は allow (検索 OK)。
 */

export const metadata = {
  title: 'プライバシー',
  description:
    'ふるさとピザ帳の個人情報・Cookie・解析ツール (GA4) の取り扱いと、利用者の権利について。',
};

export default function PrivacyPage() {
  return (
    <main
      className="mlpr-washi-noise mlpr-washi-noise--canvas"
      style={{ minHeight: '100vh', padding: '32px 16px 80px' }}
      aria-label="プライバシーポリシー"
    >
      <article
        style={{
          maxWidth: 480,
          margin: '0 auto',
          color: 'var(--mlpr-sumi)',
          lineHeight: 1.8,
        }}
      >
        <p
          style={{
            fontFamily: 'var(--mlpr-font-mono)',
            color: 'var(--mlpr-sumi-muted)',
            letterSpacing: '0.12em',
            margin: 0,
          }}
        >
          PRIVACY · プライバシーポリシー
        </p>
        <h1
          style={{
            fontFamily: 'var(--mlpr-font-mincho)',
            fontSize: 28,
            margin: '12px 0 24px',
          }}
        >
          プライバシーポリシー
        </h1>

        <p style={{ color: 'var(--mlpr-sumi-soft)', marginTop: 0 }}>
          「ふるさとピザ帳」(以下「本サービス」) は、個人が運営する小規模なアプリケーションです。
          本ページでは、本サービスが取り扱う情報・解析ツール・第三者サービスについて説明します。
          最終更新: 2026 年 6 月。
        </p>

        <Section title="1. 収集する情報">
          <ul>
            <li>
              <b>アカウント情報</b>: Google アカウントで「ピザ帳」を利用する場合、Firebase
              Authentication 経由で表示名・メールアドレス・アバター URL を取得します。
            </li>
            <li>
              <b>レシピ・振り返り</b>: ご自身で保存したピザレシピと、作ってみた記録は Firestore
              に保存されます。本人のみが閲覧できます。
            </li>
            <li>
              <b>ゲスト識別子</b>: 未ログイン利用時に重複リクエスト制御 (Rate Limit)
              のためランダムな匿名 ID を端末に保存します。個人を特定できる情報は含みません。
            </li>
          </ul>
        </Section>

        <Section title="2. 解析ツール (Google Analytics 4)">
          <p>
            利用状況の把握のため、Google Analytics 4 (GA4) を導入しています。 GA4 は Cookie
            等を用いて、ページの閲覧履歴・参照元・ブラウザ環境などを匿名化された形で収集します。
            計測 ID は <code>G-6E5PHQ544B</code> です。
          </p>
          <p>
            計測を拒否したい場合、ブラウザの「Do Not Track」設定を有効にしていただくか、
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--mlpr-shu)' }}
            >
              Google Analytics オプトアウト アドオン
            </a>
            をご利用ください。
          </p>
        </Section>

        <Section title="3. アフィリエイトリンク">
          <p>
            機材ガイドおよびレシピ詳細画面の一部に、楽天アフィリエイト (楽天市場 / 楽天ふるさと納税)
            のリンクを掲載しています。 該当リンクには <code>rel=&quot;sponsored&quot;</code>{' '}
            を付与しています。
            購入情報そのものを本サービスが受け取ることはなく、楽天側のプライバシーポリシーが適用されます。
          </p>
        </Section>

        <Section title="4. AI 生成について">
          <p>
            レシピ提案には Google Cloud Vertex AI (Gemini / Imagen) を利用します。
            選択された地域・食材はレシピ生成のためにのみ送信され、本サービスのモデル学習目的には利用されません。
          </p>
        </Section>

        <Section title="5. データの削除">
          <p>
            アカウント削除・データ削除を希望される場合は、お問い合わせフォームの「個人情報の開示・削除依頼」よりご連絡ください。
            本人確認のため、ご登録の Google アカウント (メールアドレス) を併せてご記入ください。
          </p>
          <p>
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSdETiVCGvKfLImaf8p_ru9csiBESF0JB5rPHDVAZvjonOol4g/viewform"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--mlpr-shu)' }}
            >
              お問い合わせフォームを開く →
            </a>
          </p>
        </Section>

        <Section title="6. お問い合わせ">
          <p>本ポリシーに関するご質問・バグ報告・機能要望は、下記フォームよりお寄せください。</p>
          <p>
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSdETiVCGvKfLImaf8p_ru9csiBESF0JB5rPHDVAZvjonOol4g/viewform"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--mlpr-shu)' }}
            >
              お問い合わせフォームを開く →
            </a>
          </p>
        </Section>

        <p style={{ marginTop: 40, textAlign: 'center' }}>
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
            TOP に戻る
          </Link>
        </p>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 28 }}>
      <h2
        style={{
          fontFamily: 'var(--mlpr-font-mincho)',
          fontSize: 18,
          margin: '0 0 8px',
        }}
      >
        {title}
      </h2>
      <div style={{ color: 'var(--mlpr-sumi-soft)' }}>{children}</div>
    </section>
  );
}
