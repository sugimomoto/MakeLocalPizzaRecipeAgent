'use client';

/**
 * /candidates/[sessionId] 画面の Client Component (Phase 14 リファクタ版)。
 *
 * 機能差分:
 * - 上部 3 分割: 「← 食材」/「新提案 · 3案」mincho ラベル /「↻ ふり直す」
 * - ScreenHero (「今宵の一枚を、/ あなたの目で。」) + 右に縦長 pagination dots
 * - 候補カード縦スクロール (scroll-snap-y proximity) + active dot の高さで強調
 * - sticky decide bar: 「この一枚に決める →」 (Slice 1 は no-op、Slice 3 で詳細画面)
 * - 焼成中は BakingAnimation
 */

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { CandidateCard } from '@/components/candidate/CandidateCard';
import { BakingAnimation } from '@/components/loading/BakingAnimation';
import { Button } from '@/components/primitives/Button';
import { ScreenHero } from '@/components/primitives/ScreenHero';
import { useQuickTapStream } from '@/hooks/use-quicktap-stream';

import styles from './CandidatesClient.module.css';
import { PENDING_SESSION_KEY } from '../../../ingredients/_components/IngredientSelectClient';

type PendingSession = {
  sessionId: string;
  localeId: string;
  ingredients: string[];
};

export type CandidatesClientProps = {
  sessionId: string;
};

function readPendingSession(sessionId: string): PendingSession | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(PENDING_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingSession>;
    if (
      parsed &&
      parsed.sessionId === sessionId &&
      typeof parsed.localeId === 'string' &&
      Array.isArray(parsed.ingredients)
    ) {
      return parsed as PendingSession;
    }
    return null;
  } catch {
    return null;
  }
}

export function CandidatesClient({ sessionId }: CandidatesClientProps) {
  const router = useRouter();
  const stream = useQuickTapStream();
  const startedRef = useRef(false);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (startedRef.current) return;
    const pending = readPendingSession(sessionId);
    if (!pending) {
      router.replace('/ingredients');
      return;
    }
    startedRef.current = true;
    void stream.start({ localeId: pending.localeId, ingredients: pending.ingredients });
  }, [sessionId, router, stream]);

  // 縦スクロールで最も中央に近いカードを active にする
  useEffect(() => {
    function onScroll() {
      const mid = window.scrollY + window.innerHeight / 2;
      let best = 0;
      let bestDist = Infinity;
      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const c = rect.top + window.scrollY + rect.height / 2;
        const d = Math.abs(c - mid);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      setActiveIdx(best);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isInitialLoad = stream.candidates.length === 0 && stream.state !== 'error';

  return (
    <div className={styles.shell}>
      {/* top row */}
      <div className={styles.topRow}>
        <button
          type="button"
          className={styles.backLink}
          onClick={() => router.push('/ingredients')}
        >
          <span aria-hidden="true">‹</span> 食材
        </button>
        <span className={styles.tapBadge}>新 提 案 · 3 案</span>
        <button
          type="button"
          className={styles.rerollLink}
          onClick={() => void stream.reroll(sessionId)}
          disabled={stream.state === 'streaming'}
        >
          <span aria-hidden="true">↻</span> ふり直す
        </button>
      </div>

      <div className={styles.heroRow}>
        <ScreenHero
          title={
            <>
              今宵の一枚を、
              <br />
              あなたの目で。
            </>
          }
        />
        {stream.candidates.length > 0 && (
          <div className={styles.pagination} aria-label="候補ページネーション">
            {stream.candidates.map((c, i) => (
              <div
                key={c.candidateId}
                className={[styles.dot, i === activeIdx ? styles.dotActive : null]
                  .filter(Boolean)
                  .join(' ')}
                aria-hidden="true"
              />
            ))}
          </div>
        )}
      </div>

      {isInitialLoad && (
        <div className={styles.bakingWrap}>
          <BakingAnimation label="焼成中" />
        </div>
      )}

      {stream.state === 'error' && (
        <div role="alert" className={styles.errorBox}>
          候補生成に失敗しました: {stream.error}
        </div>
      )}

      {stream.candidates.length > 0 && (
        <div className={styles.scroll}>
          {stream.candidates.map((c, i) => (
            <div
              key={c.candidateId}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className={styles.cardWrap}
            >
              <CandidateCard candidate={c} />
            </div>
          ))}
          {stream.state === 'done' && <p className={styles.tail}>── 以上、3 案 ──</p>}
        </div>
      )}

      {stream.candidates.length > 0 && (
        <div className={styles.stickyDecide}>
          <div className={styles.stickyInner}>
            <Button
              variant="shu"
              size="lg"
              style={{ width: '100%' }}
              onClick={() => {
                // Slice 3 で詳細画面に遷移予定。Slice 1 では確認ログのみ。
                if (typeof window !== 'undefined') {
                  window.alert(
                    `${stream.candidates[activeIdx]?.title ?? ''} を選びました\n(詳細画面は Slice 3 で実装予定)`,
                  );
                }
              }}
            >
              この一枚に決める →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
