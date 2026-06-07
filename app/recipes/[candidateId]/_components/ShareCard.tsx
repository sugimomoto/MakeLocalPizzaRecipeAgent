'use client';

/**
 * ShareCard — 詳細画面の共有 CTA (Slice 10 + multi-target 拡張)
 *
 * フロー:
 *   1) 詳細生成中     : disabled (description: 詳細レシピが揃ってから)
 *   2) 生成完了 / 未公開: 「公開して共有」→ ShareConfirmModal → publish
 *   3) 公開済        : 4 ターゲットボタンを表示 (X / Facebook / その他 / URL コピー)
 *
 * publish は API がべき等。`useShare` が成功で shareUrl をキャッシュするので
 * 2 回目以降の publish はそもそも呼ばない。
 */
import { useCallback, useEffect, useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics/track';
import { buildFacebookShareUrl } from '@/lib/share/build-fb-share';
import { buildXIntentUrl } from '@/lib/share/build-x-intent';
import { canUseWebShare, copyToClipboard, webShare } from '@/lib/share/web-share';

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
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  // クライアントマウント前は navigator.share の有無が不明なので Web Share ボタンを隠す
  const [webShareAvailable, setWebShareAvailable] = useState(false);
  useEffect(() => {
    // マウント時に 1 回判定する副作用なので setState を effect 内で呼ぶ
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebShareAvailable(canUseWebShare());
  }, []);

  const openConfirm = useCallback((): void => {
    if (!ready) return;
    trackEvent('share_intent');
    setConfirmOpen(true);
  }, [ready]);

  const closeConfirm = useCallback(() => {
    if (share.state === 'publishing') return;
    setConfirmOpen(false);
  }, [share.state]);

  /** publish 確定 (= モーダルの「公開する」)。発行のみ、ターゲット遷移はしない。 */
  const confirm = useCallback(async (): Promise<void> => {
    const payload = buildPayload();
    if (!payload) return;
    if (share.shareUrl) {
      setConfirmOpen(false);
      return;
    }
    const res = await share.publish(payload);
    if (!res) return;
    trackEvent('share_published', {
      share_id: res.shareId,
      prefecture: payload.prefecture,
      strategy: payload.strategy,
    });
    setConfirmOpen(false);
  }, [buildPayload, share]);

  /** ターゲット別の起動。share.shareUrl が無い場合は何もしない (ガード)。 */
  const shareToX = useCallback(() => {
    const url = share.shareUrl;
    const payload = buildPayload();
    if (!url || !payload || typeof window === 'undefined') return;
    const intent = buildXIntentUrl({
      title: payload.title,
      storyHeadline: payload.story.headline,
      shareUrl: url,
    });
    trackEvent('share_target', { target: 'x' });
    window.open(intent, '_blank', 'noopener,noreferrer');
  }, [share.shareUrl, buildPayload]);

  const shareToFacebook = useCallback(() => {
    const url = share.shareUrl;
    if (!url || typeof window === 'undefined') return;
    trackEvent('share_target', { target: 'facebook' });
    window.open(buildFacebookShareUrl(url), '_blank', 'noopener,noreferrer');
  }, [share.shareUrl]);

  const shareNative = useCallback(async () => {
    const url = share.shareUrl;
    const payload = buildPayload();
    if (!url || !payload) return;
    trackEvent('share_target', { target: 'native' });
    try {
      await webShare({
        title: payload.title,
        text: payload.story.headline,
        url,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return; // ユーザキャンセル
      toast.push({ kind: 'warning', message: '共有シートを開けませんでした' });
    }
  }, [share.shareUrl, buildPayload, toast]);

  const shareCopy = useCallback(async () => {
    const url = share.shareUrl;
    if (!url) return;
    trackEvent('share_target', { target: 'copy' });
    const ok = await copyToClipboard(url);
    toast.push({
      kind: ok ? 'success' : 'warning',
      message: ok ? 'URL をコピーしました' : 'URL のコピーに失敗しました',
    });
  }, [share.shareUrl, toast]);

  const publishedUrl = share.shareUrl;
  const ctaLabel = share.state === 'publishing' ? '公開中…' : '公開して共有する';
  const hint = ready
    ? '公開すると、誰でも閲覧できる URL が作成されます'
    : '詳細レシピが揃ってから共有できます';

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <div className={styles.body}>
          <p className={styles.eyebrow}>SHARE · 共有</p>
          <p className={styles.title}>仕上がりを SNS で見せる</p>
        </div>
        {publishedUrl ? null : (
          <button
            type="button"
            className={styles.button}
            onClick={openConfirm}
            disabled={!ready || share.state === 'publishing'}
          >
            {ctaLabel}
          </button>
        )}
      </div>

      {publishedUrl ? (
        <div className={styles.targets} role="group" aria-label="シェア先を選ぶ">
          <button
            type="button"
            className={`${styles.target} ${styles['target--x']}`}
            onClick={shareToX}
          >
            <span aria-hidden className={styles.targetIcon}>
              𝕏
            </span>
            X
          </button>
          <button
            type="button"
            className={`${styles.target} ${styles['target--fb']}`}
            onClick={shareToFacebook}
          >
            <span aria-hidden className={styles.targetIcon}>
              f
            </span>
            Facebook
          </button>
          {webShareAvailable ? (
            <button
              type="button"
              className={`${styles.target} ${styles['target--native']}`}
              onClick={() => void shareNative()}
            >
              <span aria-hidden className={styles.targetIcon}>
                ⇪
              </span>
              その他
            </button>
          ) : null}
          <button
            type="button"
            className={`${styles.target} ${styles['target--copy']}`}
            onClick={() => void shareCopy()}
          >
            <span aria-hidden className={styles.targetIcon}>
              ⎘
            </span>
            URL をコピー
          </button>
        </div>
      ) : null}

      <p className={styles.hint}>{publishedUrl ? '公開済 · 共有先を選んでください' : hint}</p>

      <ShareConfirmModal
        open={confirmOpen}
        publishing={share.state === 'publishing'}
        onClose={closeConfirm}
        onConfirm={() => void confirm()}
      />
    </div>
  );
}
