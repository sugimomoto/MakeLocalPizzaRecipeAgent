/**
 * /equipment — ENRO 機材ガイド LP (Slice 8)
 *
 * 設計: design/slice8-screens.jsx EquipmentLP (L980〜) と
 * design/slice8-app.jsx を参照。和モダン LP として既存トークンを再利用しつつ、
 * Phone frame ではなく通常の縦長スクロールページ。
 *
 * - 認証不要・静的ページ (Server Component)
 * - Hero / 開発者の声 / 3 体験変化 / 5 ステップ + 比較表 / YouTube / 家庭オーブン補足 / 最終 CTA / アフィリ注記
 * - 楽天アフィリエイトリンクは `src/lib/affiliate/rakuten.ts` 経由 (env 未設定なら素 URL)
 * - 訪問時に `localStorage.mlpr.equipmentLinkSeen.v1=1` を立てる (Dropdown NEW バッジ抑制)
 */

import Image from 'next/image';
import Link from 'next/link';

import { buildEnroStoreUrl, buildEnroProductUrl } from '@/lib/affiliate/rakuten';

import { EquipmentVisitTracker } from './_components/EquipmentVisitTracker';
import styles from './page.module.css';

export const metadata = {
  title: '機材ガイド',
  description:
    'ふるさとピザ帳が前提にしている ENRO 電気ピザ窯のガイド。400°C の高温焼成・ポータブル運用・家庭用オーブンとの比較を 1 ページに。',
};

export default function EquipmentPage() {
  const storeUrl = buildEnroStoreUrl();
  const productUrl = buildEnroProductUrl();

  return (
    <main
      className={`${styles.lp} mlpr-washi-noise mlpr-washi-noise--canvas`}
      aria-label="機材ガイド"
    >
      <EquipmentVisitTracker />

      <BrandBar />
      <Hero storeUrl={productUrl} />
      <DeveloperVoice />
      <Benefits />
      <UsageSteps />
      <CompareTable />
      <YoutubeList />
      <HomeOvenSection />
      <FinalCta storeUrl={storeUrl} />
      <FooterNotice />
      <PageEndMark />
    </main>
  );
}

// ── BrandBar ────────────────────────────────────────────────────────
function BrandBar() {
  return (
    <header className={styles.brandBar}>
      <Link href="/" className={styles.brandLeft} aria-label="ふるさとピザ帳 TOP">
        <span aria-hidden className={styles.brandMark}>
          🍕
        </span>
        <span className={styles.brandName}>ふるさとピザ帳</span>
        <span className={styles.brandTag}>機材ガイド</span>
      </Link>
      <nav className={styles.brandNav} aria-label="サブナビゲーション">
        <Link href="/" className={styles.brandNavItem}>
          つくる
        </Link>
        <span
          className={`${styles.brandNavItem} ${styles['brandNavItem--active']}`}
          aria-current="page"
        >
          機材
        </span>
        <Link href="/library" className={styles.brandNavItem}>
          保存帳
        </Link>
        <Link href="/journal" className={styles.brandNavItem}>
          振り返り帳
        </Link>
      </nav>
    </header>
  );
}

// ── Hero ────────────────────────────────────────────────────────────
function Hero({ storeUrl }: { storeUrl: string }) {
  return (
    <section className={styles.hero}>
      <span className={styles.stamp} aria-hidden>
        推 奨 機 材
      </span>
      <Eyebrow>EQUIPMENT GUIDE · 機材ガイド</Eyebrow>
      <h1 className={styles.heroTitle}>
        400°C の窯が、
        <br />
        家で<span className={styles.shu}>焼ける</span>。
      </h1>
      <p className={styles.heroBody}>
        ふるさとピザ帳が前提にしているのは、
        <br />
        <b>ENRO の電気ピザ窯</b>です。 家庭オーブンでは越えられなかった
        <wbr />
        90 秒・400°C の世界を、 電源さえあれば屋内でも持ち出し先でも。
      </p>

      <div className={styles.heroImage}>
        <Image
          src="/equipment/enro-hero.png"
          alt="ENRO 電気ピザ窯で焼き上がるピザ"
          width={608}
          height={400}
          className={styles.heroImageInner}
          priority
        />
      </div>

      <div className={styles.heroCtas}>
        <a
          href={storeUrl}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className={`${styles.cta} ${styles['cta--shu']}`}
          data-affiliate="enro"
          data-affiliate-position="hero"
        >
          ENRO を見る (楽天)
          <ExternalArrow />
        </a>
        <Link href="/local" className={`${styles.cta} ${styles['cta--ghost']}`}>
          アプリで食材を選ぶ →
        </Link>
        <span className={styles.heroAffiliateNote}>
          ※ 楽天アフィリエイト · <code>rel=&quot;sponsored&quot;</code>
        </span>
      </div>
    </section>
  );
}

// ── DeveloperVoice ──────────────────────────────────────────────────
function DeveloperVoice() {
  return (
    <section className={styles.developerSection}>
      <div className={styles.developerCard}>
        <span className={styles.developerQuote} aria-hidden>
          「
        </span>
        <div className={styles.developerInner}>
          <div className={styles.developerAvatarBlock}>
            <div className={styles.developerAvatar} aria-hidden>
              <span style={{ fontSize: '32px' }}>🍕</span>
            </div>
            <div className={styles.developerAvatarLabel}>開発者</div>
            <div className={styles.developerAvatarSub}>SENDAI · 仙台</div>
          </div>
          <div className={styles.developerBody}>
            <div className={styles.developerEyebrow}>FROM THE MAKER · 開発者から</div>
            <div className={styles.developerHeadline}>
              家庭オーブンの壁を、
              <br />
              ENRO で越えられました。
            </div>
            <p className={styles.developerText}>
              仙台で地元食材を活かしたピザパーティをやっているうちに、
              家庭オーブンでは越えられない壁があることに気付きました。 ENRO
              の電気ピザ窯を導入してからは、縁が膨らみ、中央がしっとりした
              <b>&quot;店レベル&quot;</b> の一枚が家で焼けるようになりました。
              このアプリのレシピは、その体験を前提に最適化されています。
            </p>
            <div className={styles.developerBadge}>
              <span aria-hidden className={styles.developerBadgeDot} />
              一個人ユーザとしての推奨です (案件・提携ではありません)
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Benefits (3 体験変化) ────────────────────────────────────────────
function Benefits() {
  return (
    <section className={styles.benefitsSection}>
      <Eyebrow>3 EXPERIENCE SHIFTS · 体験変化</Eyebrow>
      <h2 className={styles.sectionTitle}>ENRO で何が、変わるのか。</h2>
      <p className={styles.sectionLede}>
        家庭オーブンとの差は <b>3 つ</b>。 中でも <b className={styles.matcha}>ポータブル運用</b>{' '}
        はこのプロダクトの根幹に直結します。
      </p>
      <div className={styles.benefitsGrid}>
        <BenefitCard
          icon="🔥"
          en="HIGH HEAT"
          jp="400°C の高温焼成"
          body="90〜120 秒で焼き上げる短時間高温が、ナポリピザ本来の「縁ふくらみ・中しっとり」の食感を生む。家庭オーブンの 250°C ではどうしても辿り着けない領域。"
        />
        <BenefitCard
          emphasis
          icon="🎒"
          en="PORTABLE"
          jp="ポータブル運用"
          body="電源さえあれば、レンタルキッチン・友人宅・屋外イベントに持ち出せる。「その場で焼きたてを振る舞う」のが本来のピザ体験 — このアプリのホスト体験は、ENRO の可搬性が前提。"
          footnote="HOST × ANYWHERE"
          stripeLabel="このアプリの背骨"
        />
        <BenefitCard
          icon="¥"
          en="AFFORDABLE"
          jp="個人で買える価格帯"
          body="業務用石窯と違って、ホスト個人で導入できる価格と設置サイズ。レンタルや日割りに頼らず、自分の道具として育てていける。"
        />
      </div>
    </section>
  );
}

function BenefitCard({
  icon,
  en,
  jp,
  body,
  emphasis,
  footnote,
  stripeLabel,
}: {
  icon: string;
  en: string;
  jp: string;
  body: string;
  emphasis?: boolean;
  footnote?: string;
  stripeLabel?: string;
}) {
  return (
    <div className={`${styles.benefitCard} ${emphasis ? styles['benefitCard--emphasis'] : ''}`}>
      {emphasis ? <div className={styles.benefitKey}>★ KEY</div> : null}
      <div className={styles.benefitIcon} aria-hidden>
        {icon}
      </div>
      <div className={styles.benefitEn}>{en}</div>
      <h3 className={styles.benefitJp}>{jp}</h3>
      <p className={styles.benefitBody}>{body}</p>
      {emphasis && stripeLabel && footnote ? (
        <div className={styles.benefitStripe}>
          <span className={styles.benefitStripeLabel}>{stripeLabel}</span>
          <span className={styles.benefitStripeRule} aria-hidden />
          <span className={styles.benefitStripeFoot}>{footnote}</span>
        </div>
      ) : null}
    </div>
  );
}

// ── UsageSteps ──────────────────────────────────────────────────────
function UsageSteps() {
  const steps = [
    { n: '一', t: '予熱', sub: '15〜20 分で 400°C 到達。庫内温度計で確認。', tag: '15〜20 min' },
    { n: '二', t: '生地を伸ばす', sub: '直径 25cm、薄手。中央 4mm・縁 8mm を目安に。' },
    { n: '三', t: 'ソース + トッピング', sub: '水分の多い具は予め水切り。チーズは最後に。' },
    { n: '四', t: '投入', sub: '専用ピールで一気に。庫内中央 + やや奥に。' },
    {
      n: '五',
      t: '焼き上がり',
      sub: '90〜120 秒。途中 1 回 180° 回転で均一に。',
      tag: '90〜120 sec',
      tagShu: true,
    },
  ];
  return (
    <section className={styles.usageSection}>
      <Eyebrow>HOW IT WORKS · ENRO で焼く基本手順</Eyebrow>
      <h2 className={styles.sectionTitle}>
        5 ステップ、<span className={styles.shu}>2 分</span>で焼ける。
      </h2>
      <ol className={styles.steps}>
        {steps.map((s, i) => (
          <li key={s.n} className={styles.step}>
            <div className={styles.stepNumber} aria-hidden>
              {s.n}
            </div>
            <div className={styles.stepBody}>
              <div className={styles.stepTitleRow}>
                <span className={styles.stepTitle}>{s.t}</span>
                <span className={styles.stepIndex}>STEP {i + 1} / 5</span>
              </div>
              <div className={styles.stepSub}>{s.sub}</div>
            </div>
            {s.tag ? (
              <span className={`${styles.stepTag} ${s.tagShu ? styles['stepTag--shu'] : ''}`}>
                {s.tag}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

// ── CompareTable ────────────────────────────────────────────────────
function CompareTable() {
  const rows = [
    { label: '最高温度', oven: '250〜300°C', enro: '400〜450°C', win: 'enro' as const },
    { label: '焼成時間', oven: '8〜15 分', enro: '90〜120 秒', win: 'enro' as const },
    {
      label: '縁の食感',
      oven: 'しっかり / 締まる',
      enro: 'ふっくら / 香ばしい',
      win: 'enro' as const,
    },
    { label: '中央の状態', oven: '乾きやすい', enro: 'しっとり保つ', win: 'enro' as const },
    { label: '一枚あたり', oven: '〜 15 分', enro: '〜 2 分', win: 'enro' as const },
    { label: '屋内 / 持ち出し', oven: '固定設置', enro: '電源があれば可搬', win: 'enro' as const },
    {
      label: '導入コスト',
      oven: 'すでにある',
      enro: '個人で買える価格帯',
      win: 'oven' as const,
      winNote: '初期 0',
    },
  ];
  return (
    <section className={`${styles.compareSection} mlpr-washi-noise mlpr-washi-noise--soft`}>
      <div className={styles.compareHead}>
        <div className={styles.compareEyebrow}>COMPARE · 比較</div>
        <div className={styles.compareTitle}>家庭オーブン と ENRO</div>
      </div>
      <div className={styles.compareCols}>
        <div />
        <div className={styles.compareColHomeHead}>
          <span aria-hidden>🍳</span> 家庭用オーブン
        </div>
        <div />
        <div className={styles.compareColEnroHead}>
          <span aria-hidden>🔥</span> ENRO 電気ピザ窯
          <span className={styles.compareRecommended}>推奨</span>
        </div>
      </div>
      <div className={styles.compareRows}>
        {rows.map((r, i) => (
          <div key={r.label} className={styles.compareRow} data-first={i === 0 ? 'true' : 'false'}>
            <div className={styles.compareLabel}>{r.label}</div>
            <div
              className={`${styles.compareCell} ${r.win === 'oven' ? styles['compareCell--win'] : ''}`}
            >
              {r.oven}
              {r.win === 'oven' && r.winNote ? (
                <span className={styles.compareCellNote}>{r.winNote}</span>
              ) : null}
            </div>
            <div className={styles.compareDivider} aria-hidden />
            <div
              className={`${styles.compareCell} ${r.win === 'enro' ? styles['compareCell--win'] : ''}`}
            >
              {r.enro}
              {r.win === 'enro' ? <span aria-hidden className={styles.compareDot} /> : null}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.compareFooter}>
        <b>結局のところ</b> ― ENRO は 「短時間 × 高温」 で家庭オーブンが届かない領域に行きます。
        家庭オーブンも <b>機材プロファイル</b>{' '}
        を切り替えれば、温度・時間に合わせたレシピに再生成されます。
      </div>
    </section>
  );
}

// ── YoutubeList ─────────────────────────────────────────────────────
// ENRO ピザ大学 (https://www.youtube.com/@enro2442) の公式動画を 3 本紹介。
// 動画 ID から YouTube の hqdefault サムネを背景画像として読み込み、カード
// 全体を <a target="_blank"> でリンク化する (動画削除リスクはあるが ID 単位の
// 差し替えで対応可能、埋め込みではなくリンクなので oEmbed 規約も不要)。
function YoutubeList() {
  const vids: { id: string; jp: string; tag: string }[] = [
    {
      id: '25YVc-l92g4',
      jp: '【窯焼名人 レシピ】2 時間で作れて当日使える時短だけど本格ピザ生地レシピ',
      tag: '時短',
    },
    {
      id: 'gy0L14MKO00',
      jp: '【ピザ作り完全版動画】ピザ生地作りの全てのコツ、窯での焼成まで全て解説!',
      tag: '完全版',
    },
    {
      id: 'Kj_apev_I34',
      jp: '【ピザ生地作りのコツ】生地を作るときにやってしまいがちなミス 5 選!',
      tag: 'コツ',
    },
  ];
  return (
    <section className={styles.youtubeSection}>
      <div className={styles.youtubeHead}>
        <span className={styles.youtubeTitle}>動画で見る</span>
        <span className={styles.youtubeSub}>YOUTUBE · ENRO ピザ大学</span>
        <span aria-hidden className={styles.youtubeRule} />
        <a
          href="https://www.youtube.com/@enro2442"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.youtubeChannelLink}
        >
          チャンネルへ →
        </a>
      </div>
      <div className={styles.youtubeGrid}>
        {vids.map((v) => (
          <a
            key={v.id}
            href={`https://www.youtube.com/watch?v=${v.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.youtubeCard}
            aria-label={`YouTube で見る: ${v.jp}`}
          >
            <div
              className={styles.youtubeThumb}
              style={{
                backgroundImage: `url(https://img.youtube.com/vi/${v.id}/hqdefault.jpg)`,
              }}
              aria-hidden
            >
              <div className={styles.youtubeThumbDim} aria-hidden />
              <div className={styles.youtubePlay}>▶</div>
              <div className={styles.youtubeTag}>{v.tag}</div>
            </div>
            <div className={styles.youtubeBody}>
              <div className={styles.youtubeVideoTitle}>{v.jp}</div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

// ── HomeOvenSection ─────────────────────────────────────────────────
function HomeOvenSection() {
  return (
    <section className={styles.homeOvenSection}>
      <div className={styles.homeOvenCard}>
        <Eyebrow muted>FOR HOME OVENS · 機材を揃える前に</Eyebrow>
        <h2 className={styles.homeOvenTitle}>
          いまある家庭用オーブンで、
          <br />
          まず試したい方へ。
        </h2>
        <div className={styles.homeOvenBody}>
          <div>
            <p className={styles.homeOvenLede}>
              アプリ内の設定で <b>機材プロファイル</b> を
              <span className={styles.homeOvenInlineChip}>🍳 家庭用オーブン</span>
              に切り替えると、レシピが <b>250〜300°C / 8〜15 分</b> の前提で再生成されます。
            </p>
            <p className={styles.homeOvenSub}>
              ただし、本アプリの本領は ENRO による高温焼成にあります。
              「今夜試したい」から始めて、ハマったら ENRO に進む — その順序で問題ありません。
            </p>
            <Link href="/local" className={`${styles.cta} ${styles['cta--ghost-quiet']}`}>
              アプリで地元 → 食材を選ぶ →
            </Link>
          </div>
          <ProfileSwitchIllustration />
        </div>
      </div>
    </section>
  );
}

function ProfileSwitchIllustration() {
  return (
    <div className={`${styles.switchIll} mlpr-washi-noise mlpr-washi-noise--canvas`}>
      <div className={styles.switchIllEyebrow}>SCREEN · 機材プロファイル切替</div>
      <div className={`${styles.switchIllRow} ${styles['switchIllRow--selected']}`}>
        <div className={styles.switchIllEmoji} data-kind="enro">
          🔥
        </div>
        <div className={styles.switchIllText}>
          <div className={styles.switchIllJp}>ENRO 電気ピザ窯</div>
          <div className={styles.switchIllSpec}>400〜450°C · 90〜120 秒</div>
        </div>
        <div className={styles.switchIllRadioOn} aria-hidden>
          ✓
        </div>
      </div>
      <div className={styles.switchIllRow}>
        <div className={styles.switchIllEmoji} data-kind="home">
          🍳
        </div>
        <div className={styles.switchIllText}>
          <div className={styles.switchIllJp}>家庭用オーブン</div>
          <div className={styles.switchIllSpec}>250〜300°C · 8〜15 分</div>
        </div>
        <div className={styles.switchIllRadioOff} aria-hidden />
      </div>
    </div>
  );
}

// ── FinalCta ────────────────────────────────────────────────────────
function FinalCta({ storeUrl }: { storeUrl: string }) {
  return (
    <section className={styles.finalCtaSection}>
      <div className={styles.finalCtaCard}>
        <div className={styles.finalCtaEyebrow}>READY · 始める</div>
        <h2 className={styles.finalCtaTitle}>
          400°C の世界を、
          <br />
          今夜の食卓へ。
        </h2>
        <p className={styles.finalCtaBody}>
          ENRO で焼くことを前提に作ったレシピが、3 枚すぐ届きます。
          家庭オーブンの方は機材プロファイル切替で同じレシピを再生成。
        </p>
        <div className={styles.finalCtaButtons}>
          <a
            href={storeUrl}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className={`${styles.cta} ${styles['cta--shu-light']}`}
            data-affiliate="enro"
            data-affiliate-position="final-cta"
          >
            ENRO を見る (楽天) <ExternalArrow color="#9F3220" />
          </a>
          <Link href="/local" className={`${styles.cta} ${styles['cta--ghost-light']}`}>
            ふるさとピザ帳を試す →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── FooterNotice ────────────────────────────────────────────────────
function FooterNotice() {
  return (
    <footer className={styles.footerNoticeSection}>
      <div className={styles.footerNoticeCard}>
        <div className={styles.footerNoticeIcon} aria-hidden>
          ⓘ
        </div>
        <div className={styles.footerNoticeBody}>
          <div className={styles.footerNoticeTitle}>アフィリエイトに関する透明性表示</div>
          <div className={styles.footerNoticeText}>
            ※ 本ページのリンク (<code>ENRO を見る</code>) は楽天アフィリエイトを含みます (
            <code>rel=&quot;sponsored&quot;</code>)。 運営者は ENRO の <b>1 ユーザ</b>{' '}
            として本機材を推奨していますが、 メーカー・販売店との <b>提携・PR 案件ではありません</b>
            。 クリックによる紹介手数料が、運営費に充当されます。
          </div>
        </div>
        <span className={styles.footerNoticeTag}>SLICE 8</span>
      </div>
    </footer>
  );
}

function PageEndMark() {
  return (
    <div className={styles.pageEnd}>
      <span>FURUSATO PIZZA-CHŌ · 2026 · /equipment</span>
      <span>
        v0.8 · ENRO RECOMMENDED · <Link href="/privacy">プライバシー</Link>
      </span>
    </div>
  );
}

// ── helpers ─────────────────────────────────────────────────────────
function Eyebrow({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <div className={`${styles.eyebrow} ${muted ? styles['eyebrow--muted'] : ''}`}>
      <span aria-hidden className={styles.eyebrowRule} />
      <span className={styles.eyebrowText}>{children}</span>
      <span aria-hidden className={styles.eyebrowRule} />
    </div>
  );
}

function ExternalArrow({ color = '#fff' }: { color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M6 3h7v7M13 3L7 9M11 12v1H3V5h1"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
