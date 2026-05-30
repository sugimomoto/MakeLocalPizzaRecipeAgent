'use client';

/**
 * TOP ページ (`/`) の Client Component
 *
 * Slice 4: HomeRedirector を refactor、リピーターは /local に自動遷移していた
 * Slice 7: FurusatoMark + ブランドキャプションを追加。
 *          自動リダイレクト (リピーター → /local / 認証済 → /library) を廃止し、
 *          TOP のブランドマーク + キャッチコピー + 「始める →」を常に見せる。
 *
 * TOP の中身:
 *   - FurusatoMark (variant B、size 104) を中央配置
 *   - ブランドキャプション「ふるさとピザ帳 / FURUSATO PIZZA-CHŌ」
 *   - eyebrow + 大型明朝のキャッチコピー「未来の一枚は、〜」
 *   - 朱の primary CTA「始める →」→ /local
 *   - 「サインインしてピザ帳を開く」リンク → openModal()
 *   - footer
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { FurusatoMark } from '@/components/brand/FurusatoMark';
import { Button } from '@/components/primitives/Button';
import { useLocale } from '@/hooks/use-locale';
import { useSignInModal } from '@/hooks/use-sign-in-modal';

import styles from './TopClient.module.css';

export function TopClient(): React.JSX.Element | null {
  const router = useRouter();
  const { isHydrated } = useLocale();
  const { openModal } = useSignInModal();

  // Slice 7: 自動リダイレクトを廃止。ブランドマーク + コピーを常に見せ、
  // /local への遷移は「始める →」 / /library は Dropdown「ピザ帳 (保存)」経由。
  // hydration 待ちは描画なし (SSR mismatch 回避)
  if (!isHydrated) return null;

  return (
    <div className={styles.shell}>
      {/* Slice 7: 戦略印 3 つ → ふるさとピザ帳のブランドマークに置換 */}
      <div className={styles.markRow} aria-hidden>
        <FurusatoMark variant="B" size={104} />
      </div>

      <div className={styles.center}>
        <p className={styles.eyebrow} aria-hidden>
          地 元 × ピ ザ × AI
        </p>
        <div className={styles.brandLine}>
          <span className={styles.brandJp}>ふるさとピザ帳</span>
          <span className={styles.brandEn}>FURUSATO PIZZA-CHŌ</span>
        </div>
        <h1 className={styles.title}>
          未来の一枚は、
          <br />
          あなたの地元にある。
        </h1>
        <p className={styles.body}>
          地元の食材と季節から、
          <br />
          AI があなただけのピザを 3 案提案。
          <br />
          気に入った 1 枚は「ふるさとピザ帳」に残せます。
        </p>
      </div>

      <div className={styles.ctas}>
        <Button
          variant="shu"
          size="lg"
          style={{ width: '100%' }}
          onClick={() => router.push('/local')}
        >
          始める →
        </Button>
        {/* Slice 8: 主 CTA 直下の 3 ピル — /library, /journal, /equipment への導線。
            機材ガイドのみ朱トーンで存在を匂わせる。 */}
        <nav className={styles.subLinks} aria-label="サブナビゲーション">
          <Link href="/library" className={styles.subPill}>
            <span aria-hidden>📔</span>
            ピザ帳
          </Link>
          <Link href="/journal" className={styles.subPill}>
            <span aria-hidden>📓</span>
            振り返り帳
          </Link>
          <Link href="/equipment" className={`${styles.subPill} ${styles['subPill--accent']}`}>
            <span aria-hidden>🔥</span>
            機材ガイド
          </Link>
        </nav>
        <button type="button" className={styles.signInLink} onClick={openModal}>
          サインインしてピザ帳を開く
        </button>
      </div>

      <p className={styles.footer} aria-hidden>
        FURUSATO PIZZA-CHŌ · 2026
      </p>
    </div>
  );
}
