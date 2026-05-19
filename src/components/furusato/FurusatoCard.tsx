/**
 * FurusatoCard — 楽天ふるさと納税 1 返礼品のカード (Slice 5、Card B inline 採用)。
 *
 * デザイン (Claude Design slice5-furusato.jsx, sub-variant B1 inline):
 *   ┌──────────────────────────────────────────────────────┐
 *   │ [thumb 72px] [RAKUTEN ↗] 自治体                       │
 *   │              タイトル mincho 2 行 ellipsis             │
 *   │              生産者 (任意)                             │
 *   │              寄附 NNN,NNN 円〜  [取り寄せる ↗]         │
 *   └──────────────────────────────────────────────────────┘
 *
 * - カード全体が `<a>` で `affiliateUrl ?? url` を新タブで開く
 * - rel="sponsored" でアフィリエイトリンクであることを明示
 * - 在庫切れ時は opacity 0.65 + 「在庫切れ」バッジ
 * - 朱 CTA は使わない (詳細画面の「作ってみる →」と競合させない、sumi BG)
 */
import styles from './FurusatoCard.module.css';

import type { FurusatoItem } from '@/domain/furusato';

export type FurusatoCardProps = {
  item: FurusatoItem;
};

/** 外部リンクの ↗ アイコン (Card B のキーシグナル、design.md 参照) */
function ExtLinkIcon({ size = 10 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden
      className={styles.extIcon}
    >
      <path d="M3 2H8V7M8 2L2 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function FurusatoCard({ item }: FurusatoCardProps): React.JSX.Element {
  const href = item.affiliateUrl ?? item.url;
  const outOfStock = !item.inStock;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={`${styles.card} ${outOfStock ? styles.outOfStock : ''}`.trim()}
      aria-label={`${item.title} を楽天で開く`}
    >
      <div className={styles.thumb}>
        {item.imageUrl ? (
          // 外部画像なので next/image は使わない (Slice 6 で remotePatterns 検討)
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            className={styles.thumbImage}
            referrerPolicy="no-referrer"
            draggable={false}
            loading="lazy"
          />
        ) : (
          <span className={styles.thumbFallback} aria-hidden>
            🎁
          </span>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.topRow}>
          <span className={styles.rakutenChip}>
            <span className={styles.rakutenLabel}>RAKUTEN</span>
            <ExtLinkIcon />
          </span>
          {item.municipality && <span className={styles.municipality}>{item.municipality}</span>}
        </div>

        <div className={styles.title}>{item.title}</div>

        {item.producer && <div className={styles.producer}>{item.producer}</div>}

        <div className={styles.bottomRow}>
          <span className={styles.price}>
            <span className={styles.priceLabel}>寄附</span>
            <span className={styles.priceAmount}>
              {item.donationAmount.toLocaleString('ja-JP')}
            </span>
            <span className={styles.priceSuffix}>円〜</span>
          </span>

          {outOfStock && <span className={styles.stockBadge}>在庫切れ</span>}

          <span className={styles.cta}>
            取り寄せる
            <ExtLinkIcon size={10} />
          </span>
        </div>
      </div>
    </a>
  );
}
