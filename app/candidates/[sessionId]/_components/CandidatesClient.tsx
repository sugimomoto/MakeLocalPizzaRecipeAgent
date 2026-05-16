'use client';

/**
 * /candidates/[sessionId] 画面の Client Component。
 *
 * - mount で sessionStorage から { sessionId, localeId, ingredients } を取り出し
 *   useQuickTapStream.start() を発火
 * - 受信中は BakingAnimation で焼成演出、3 件すべて descriptive レベル以上に
 *   なったら CandidateCard を順次表示
 * - 「振り直し」ボタンで reroll、「やり直す (食材選択へ)」で /ingredients に戻る
 */

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { BakingAnimation } from '@/components/loading/BakingAnimation';
import { CandidateCard } from '@/components/candidate/CandidateCard';
import { Button } from '@/components/primitives/Button';
import { useQuickTapStream } from '@/hooks/use-quicktap-stream';

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

  useEffect(() => {
    if (startedRef.current) return;
    const pending = readPendingSession(sessionId);
    if (!pending) {
      // 直接アクセス等で payload が無いなら食材選択へ戻す
      router.replace('/ingredients');
      return;
    }
    startedRef.current = true;
    void stream.start({ localeId: pending.localeId, ingredients: pending.ingredients });
  }, [sessionId, router, stream]);

  const isInitialLoad = stream.candidates.length === 0 && stream.state !== 'error';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {isInitialLoad && <BakingAnimation />}

      {stream.state === 'error' && (
        <div role="alert" style={{ color: 'var(--mlpr-shu-deep)', textAlign: 'center' }}>
          候補生成に失敗しました: {stream.error}
        </div>
      )}

      {stream.candidates.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {stream.candidates.map((c) => (
            <CandidateCard key={c.candidateId} candidate={c} />
          ))}
        </div>
      )}

      {(stream.state === 'done' || stream.state === 'error') && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
            paddingTop: 12,
            flexWrap: 'wrap',
          }}
        >
          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              router.push('/ingredients');
            }}
          >
            食材を選び直す
          </Button>
          <Button
            variant="yamabuki"
            size="md"
            onClick={() => {
              void stream.reroll(sessionId);
            }}
          >
            別の 3 案を見る (振り直し)
          </Button>
        </div>
      )}
    </div>
  );
}
