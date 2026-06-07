'use client';

/**
 * ShareCard — 詳細画面の「X で共有」セカンダリ CTA (Slice 10)
 *
 * 状態遷移:
 *   生成中             : disabled (description: 詳細レシピが揃ってから)
 *   生成完了 / 未共有  : 「X で共有」をタップ → 確認モーダル → publish → X intent
 *   公開済 (同セッション内)
 *                       : 「X で再共有」+ POST はべき等なので同じ URL が返る
 *
 * 同 candidateId で 2 回目以降の publish は API がべき等で同 shareId を返す。
 * client 側でも shareUrl をローカル state に持ち、不要な POST を避ける。
 */
import { useCallback, useState } from 'react';

import { trackEvent } from '@/lib/analytics/track';
import { buildXIntentUrl } from '@/lib/share/build-x-intent';

import { ShareConfirmModal } from './ShareConfirmModal';
import styles from './ShareCard.module.css';

import { useShare } from '@/hooks/use-share';

import type { ShareRequest } from '@/domain/share';

export type ShareCardProps = {
  /** 詳細生成が完了して全フィールドが揃ったか */
  ready: boolean;
  /** API へ送る完全なペイロード生成。null = 必要フィールドが揃っていない */
  buildPayload: () => ShareRequest | null;
};

export function ShareCard({ ready, buildPayload }: ShareCardProps): React.JSX.Element {
  const share = useShare();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const openConfirm = useCallback((): void => {
    if (!ready) return;
    trackEvent('share_intent');
    setConfirmOpen(true);
  }, [ready]);

  const closeConfirm = useCallback(() => {
    if (share.state === 'publishing') return;
    setConfirmOpen(false);
  }, [share.state]);

  const confirm = useCallback(async (): Promise<void> => {
    const payload = buildPayload();
    if (!payload) return;

    let url: string | null = share.shareUrl;
    if (!url) {
      const res = await share.publish(payload);
      if (!res) return; // 失敗時は publish 内で Toast 済
      url = res.url;
      trackEvent('share_published', {
        share_id: res.shareId,
        prefecture: payload.prefecture,
        strategy: payload.strategy,
      });
    }

    const intentUrl = buildXIntentUrl({
      title: payload.title,
      storyHeadline: payload.story.headline,
      shareUrl: url,
    });
    if (typeof window !== 'undefined') {
      window.open(intentUrl, '_blank', 'noopener,noreferrer');
    }
    setConfirmOpen(false);
  }, [buildPayload, share]);

  const buttonLabel =
    share.state === 'publishing' ? '公開中…' : share.state === 'shared' ? 'X で再共有' : 'X で共有';
  const hint = ready
    ? share.state === 'shared'
      ? '共有 URL は同じものが使い回されます'
      : 'URL を作成して X の投稿画面を開きます'
    : '詳細レシピが揃ってから共有できます';

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <div className={styles.body}>
          <p className={styles.eyebrow}>SHARE · 共有</p>
          <p className={styles.title}>仕上がりを X で見せる</p>
        </div>
        <button
          type="button"
          className={styles.button}
          onClick={openConfirm}
          disabled={!ready || share.state === 'publishing'}
        >
          {buttonLabel}
        </button>
      </div>
      <p className={styles.hint}>{hint}</p>

      <ShareConfirmModal
        open={confirmOpen}
        publishing={share.state === 'publishing'}
        onClose={closeConfirm}
        onConfirm={() => void confirm()}
      />
    </div>
  );
}
