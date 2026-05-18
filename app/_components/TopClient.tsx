'use client';

/**
 * TOP ページ (`/`) の Client Component (Slice 4 で HomeRedirector を refactor)。
 *
 * 振る舞い:
 * - hydration 待ち中は何も描画しない (SSR と CSR の不整合回避)
 * - hydration 後:
 *   - 既に localeId が選択済み (リピーター) → /local に即 replace
 *     (Slice 3 までの「アプリを開いたら直近の地元で再開」体験を維持)
 *   - localeId 未選択 (初回訪問者) → TOP の中身を表示
 *
 * TOP の中身:
 *   - 上部に 3 戦略印 (王道/一歩外す/大冒険) のオーナメント (薄い alpha)
 *   - eyebrow + 大型明朝の見出し + サブコピー
 *   - 朱の primary CTA「始める →」→ /local
 *   - 「サインインしてピザ帳を開く」リンク → openModal() (成功時に /library)
 *   - footer の作品名
 */
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { StrategySeal } from '@/components/candidate/StrategySeal';
import { Button } from '@/components/primitives/Button';
import { useAuth } from '@/hooks/use-auth';
import { useLocale } from '@/hooks/use-locale';
import { useSignInModal } from '@/hooks/use-sign-in-modal';

import styles from './TopClient.module.css';

export function TopClient(): React.JSX.Element | null {
  const router = useRouter();
  const { localeId, isHydrated } = useLocale();
  const { status } = useAuth();
  const { openModal } = useSignInModal();

  // リピーター (localeId 保持済み) は /local に直行
  useEffect(() => {
    if (!isHydrated) return;
    if (localeId) router.replace('/local');
  }, [isHydrated, localeId, router]);

  // サインイン済になったら自動で /library に飛ばす
  // (TOP の「サインインしてピザ帳を開く」リンク → Modal → サインイン → ここ)
  useEffect(() => {
    if (!isHydrated) return;
    if (status === 'authenticated' && !localeId) {
      router.replace('/library');
    }
  }, [isHydrated, status, localeId, router]);

  // hydration 待ちは描画なし
  if (!isHydrated) return null;
  // リピーターは redirect 中なので空
  if (localeId) return null;

  return (
    <div className={styles.shell}>
      <div className={styles.ornament} aria-hidden>
        <div className={styles.sealWrap}>
          <StrategySeal strategy="exploit" size={48} />
        </div>
        <div className={styles.sealWrap}>
          <StrategySeal strategy="tune" size={48} />
        </div>
        <div className={styles.sealWrap}>
          <StrategySeal strategy="explore" size={48} />
        </div>
      </div>

      <div className={styles.center}>
        <p className={styles.eyebrow} aria-hidden>
          地 元 × ピ ザ × AI
        </p>
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
          気に入った 1 枚は「ピザ帳」に残せます。
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
        <button type="button" className={styles.signInLink} onClick={openModal}>
          サインインしてピザ帳を開く
        </button>
      </div>

      <p className={styles.footer} aria-hidden>
        MAKE LOCAL PIZZA RECIPE AGENT · 2026
      </p>
    </div>
  );
}
