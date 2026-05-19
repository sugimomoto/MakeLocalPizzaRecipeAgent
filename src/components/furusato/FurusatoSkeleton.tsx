/**
 * FurusatoSkeleton — Firestore onSnapshot 初回受信前のロード表示。
 *
 * デザイン: Claude Design slice5-furusato.jsx の FurusatoSkeleton と同じ
 * (72px 角サムネ + 3 バー + 価格行)。
 */
import styles from './FurusatoSkeleton.module.css';

export function FurusatoSkeleton(): React.JSX.Element {
  return (
    <div className={styles.skeleton} role="status" aria-label="ふるさと納税返礼品を読み込み中">
      <div className={styles.thumb} />
      <div className={styles.body}>
        <div className={styles.bar} style={{ width: '95%' }} />
        <div className={styles.bar} style={{ width: '70%', marginTop: 8 }} />
        <div className={styles.bar} style={{ width: '55%', marginTop: 12, height: 7 }} />
        <div className={styles.bottom}>
          <div className={styles.bar} style={{ width: '40%', height: 10 }} />
          <div className={styles.bar} style={{ width: '20%', height: 10 }} />
        </div>
      </div>
    </div>
  );
}
