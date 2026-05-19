/**
 * RakutenCredit — 楽天規約 §8 で必須のクレジット表記。
 *
 * セクション内フッタ (FurusatoSection の最下部) に必ず置く。
 * 公式ロゴは使わず、小さな R アイコン (内製 SVG) + 文字表記で完結。
 */
import styles from './RakutenCredit.module.css';

export function RakutenCredit(): React.JSX.Element {
  return (
    <div className={styles.credit}>
      <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden className={styles.icon}>
        <rect
          x="0.5"
          y="0.5"
          width="11"
          height="11"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
        />
        <path
          d="M3.5 9 V3.4 H6.2 Q8 3.4 8 5 Q8 6 7 6.4 L8.3 9 M3.5 6.3 H6.2"
          stroke="currentColor"
          strokeWidth="0.9"
          fill="none"
          strokeLinejoin="round"
        />
      </svg>
      <span className={styles.label}>POWERED BY 楽天ウェブサービス</span>
    </div>
  );
}
