'use client';

/**
 * /candidates/[sessionId] 画面の Client Component。
 *
 * - 上部 3 分割: 「← 食材」/「新提案 · 3案」mincho ラベル /「↻ ふり直す」
 * - ScreenHero (「今宵の一枚を、/ あなたの目で。」) + 右に縦長 pagination dots
 * - 候補カードを縦に 3 枚並べる。**カードクリックで活性化** (旧: スクロール検出)
 * - 活性化カードは朱色のリング + 「選択中」バッジで強調 (CandidateCard 側)
 * - sticky decide bar: 「「<title>」に決める →」で詳細画面へ
 * - 焼成中は BakingAnimation
 */

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { AvatarButton } from '@/components/auth/AvatarButton';
import { CandidateCard } from '@/components/candidate/CandidateCard';
import { BakingAnimation } from '@/components/loading/BakingAnimation';
import { Button } from '@/components/primitives/Button';
import { ScreenHero } from '@/components/primitives/ScreenHero';
import { HeaderRow } from '@/components/shell/HeaderRow';
import { useQuickTapStream } from '@/hooks/use-quicktap-stream';
import {
  clearCandidatesCache,
  readCandidatesCache,
  writeCandidatesCache,
} from '@/lib/cache/stream-cache';
import { PENDING_RECIPE_KEY, PENDING_SESSION_KEY } from '@/lib/storage-keys';

import styles from './CandidatesClient.module.css';

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
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (startedRef.current) return;
    // Slice 7: リロード時の再生成回避。先にキャッシュ (sessionStorage) を見る。
    // キャッシュがあれば pending session が無くてもリロード復元できるようにする
    // (pending session は /ingredients → /candidates 遷移時の中継のため、リロード
    //  後は既に消費されているケースがある)。
    const cached = readCandidatesCache(sessionId);
    if (cached) {
      startedRef.current = true;
      stream.hydrate(sessionId, cached);
      return;
    }
    const pending = readPendingSession(sessionId);
    if (!pending) {
      router.replace('/ingredients');
      return;
    }
    startedRef.current = true;
    void stream.start({ localeId: pending.localeId, ingredients: pending.ingredients });
  }, [sessionId, router, stream]);

  // stream が 'done' に達したら sessionStorage キャッシュへ書き込み。リロード時に
  // 同じ結果が即時に復元される。reroll で再生成された場合も最新版で上書きされる。
  useEffect(() => {
    if (stream.state !== 'done') return;
    if (stream.candidates.length === 0) return;
    writeCandidatesCache(sessionId, stream.candidates);
  }, [stream.state, stream.candidates, sessionId]);

  // 焼成中: state が idle/streaming で、まだ 1 件も完成 (isDone) していない間。
  // 第 1 候補が isDone になったらカード一覧を表示する (Gemini の構造化出力は一括返却なので
  // candidate.start だけで切り替えると空カードが長く見えてしまう体験を回避)。
  const hasAnyDone = stream.candidates.some((c) => c.isDone);
  const isInitialLoad = !hasAnyDone && stream.state !== 'error' && stream.state !== 'done';

  return (
    <div className={styles.shell}>
      <div className={styles.topRowOuter}>
        <HeaderRow title="候補 3 案" rightSlot={<AvatarButton />} />
      </div>
      {/* Slice 7 改修前の sub row (tap badge + 「ふり直す」) を維持 */}
      <div className={styles.topRow}>
        <span className={styles.tapBadge}>新 提 案 · 3 案</span>
        <div className={styles.topRowRight}>
          <button
            type="button"
            className={styles.rerollLink}
            onClick={() => {
              // ユーザの明示的な再生成意図 → 古いキャッシュを破棄
              clearCandidatesCache(sessionId);
              // Slice 7: 旧仕様は server in-memory cache 依存で 500 になっていた。
              // クライアント側 (sessionStorage) に持っている pending session の
              // context を明示渡しでサーバへ渡す。
              const pending = readPendingSession(sessionId);
              if (!pending) {
                router.replace('/ingredients');
                return;
              }
              void stream.reroll(sessionId, {
                localeId: pending.localeId,
                ingredients: pending.ingredients,
              });
            }}
            disabled={stream.state === 'streaming'}
          >
            <span aria-hidden="true">↻</span> ふり直す
          </button>
        </div>
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
        {!isInitialLoad && stream.candidates.length > 0 && (
          <div className={styles.pagination} aria-label="候補ページネーション">
            {stream.candidates.map((c, i) => (
              <button
                key={c.candidateId}
                type="button"
                className={[styles.dot, i === activeIdx ? styles.dotActive : null]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={`候補 ${i + 1} を選ぶ${i === activeIdx ? ' (選択中)' : ''}`}
                aria-pressed={i === activeIdx}
                onClick={() => setActiveIdx(i)}
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

      {!isInitialLoad && stream.candidates.length > 0 && (
        <div className={styles.scroll}>
          {stream.candidates.map((c, i) => (
            <div key={c.candidateId} className={styles.cardWrap}>
              <CandidateCard
                candidate={c}
                isActive={i === activeIdx}
                onSelect={() => setActiveIdx(i)}
              />
            </div>
          ))}
          {stream.state === 'done' && <p className={styles.tail}>── 以上、3 案 ──</p>}
        </div>
      )}

      {!isInitialLoad && stream.candidates.length > 0 && (
        <div className={styles.stickyDecide}>
          <div className={styles.stickyInner}>
            {(() => {
              const active = stream.candidates[activeIdx];
              const ready = !!active && active.isDone;
              const label = active?.title ? `「${active.title}」に決める →` : 'この一枚に決める →';
              return (
                <Button
                  variant="shu"
                  size="lg"
                  style={{ width: '100%' }}
                  disabled={!ready}
                  onClick={() => {
                    if (!active || !active.isDone) return;
                    const pending = readPendingSession(sessionId);
                    if (!pending || typeof window === 'undefined') return;
                    // 詳細画面 (Slice 3) は sessionStorage の PENDING_RECIPE_KEY に
                    // 候補スナップショット + localeId + ingredients を期待する。
                    const snapshot = {
                      candidateId: active.candidateId,
                      localeId: pending.localeId,
                      ingredients: pending.ingredients,
                      candidate: {
                        candidateId: active.candidateId,
                        strategy: active.strategy,
                        title: active.title ?? '',
                        concept: active.concept ?? '',
                        keyIngredients: active.keyIngredients ?? [],
                        sceneTags: active.sceneTags ?? [],
                        why: active.why ?? '',
                      },
                    };
                    window.sessionStorage.setItem(PENDING_RECIPE_KEY, JSON.stringify(snapshot));
                    router.push(`/recipes/${encodeURIComponent(active.candidateId)}`);
                  }}
                >
                  {label}
                </Button>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
