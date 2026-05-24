'use client';

/**
 * FeedbackClient — /feedback/[candidateId] のメインクライアント (Slice 7)
 *
 * 要件 (FR-7-1 / FR-7-10 / FR-7-11):
 * - 認証必須。未認証 → SignInModal 起動 + /library redirect (タップ後の戻りで再来訪可)
 * - SavedRecipe が無ければ /library にリダイレクト + warning Toast
 * - 初期値 = saved > draft > empty (useFeedback の initial に従う)
 * - 各フォーム値変更 → 3 秒 debounce で drafts/{id} + localStorage に自動保存
 * - 「記録して〜」CTA で saveFeedback → toast → router.push('/journal')
 * - overallRating === 0 で CTA disabled + ヒント
 */

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type JSX } from 'react';

import { AvatarButton } from '@/components/auth/AvatarButton';
import { CameraPlaceholder } from '@/components/feedback/CameraPlaceholder';
import { ChipGroup } from '@/components/feedback/ChipGroup';
import { DotsInput } from '@/components/feedback/DotsInput';
import { GuestCountInput } from '@/components/feedback/GuestCountInput';
import { StarInput } from '@/components/feedback/StarInput';
import { HeaderRow } from '@/components/shell/HeaderRow';
import {
  FEEDBACK_AXIS_LABELS,
  FEEDBACK_AXIS_ORDER,
  FEEDBACK_CHIP_OPTIONS,
  type FeedbackAxisKey,
  type FeedbackScore,
} from '@/domain/feedback';
import { useAuth } from '@/hooks/use-auth';
import { useFeedback, type FeedbackFormValue } from '@/hooks/use-feedback';
import { useFeedbackDraft } from '@/hooks/use-feedback-draft';
import { useSignInModal } from '@/hooks/use-sign-in-modal';
import { useToast } from '@/hooks/use-toast';

import styles from './FeedbackClient.module.css';

export type FeedbackClientProps = {
  candidateId: string;
};

function formatLastSavedAgo(lastSavedAt: Date | null, now: number): string | null {
  if (!lastSavedAt || now === 0) return null;
  const sec = Math.max(1, Math.floor((now - lastSavedAt.getTime()) / 1000));
  if (sec < 60) return `自動保存 ${sec} 秒前`;
  const min = Math.floor(sec / 60);
  return `自動保存 ${min} 分前`;
}

export function FeedbackClient({ candidateId }: FeedbackClientProps): JSX.Element {
  const router = useRouter();
  const { status } = useAuth();
  const { openModal } = useSignInModal();
  const toast = useToast();
  const { state, saved, recipe, initial, save } = useFeedback(candidateId);

  // controlled form state (initial で hydrate)
  const [form, setForm] = useState<FeedbackFormValue>(initial);
  const initializedRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  // 「自動保存 N 秒前」表示を駆動する単なる tick。0 始まり → useEffect で 10s 毎に更新。
  const [nowTick, setNowTick] = useState(0);

  // initial が saved/draft で更新されたら 1 回だけ form に反映
  useEffect(() => {
    if (initializedRef.current) return;
    if (state === 'loading') return;
    initializedRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(initial);
  }, [state, initial]);

  // 「自動保存 N 秒前」表示を 10s 毎に更新。Date.now の参照値は client mount 時に取得する。
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNowTick(Date.now());
    const id = setInterval(() => setNowTick(Date.now()), 10000);
    return () => clearInterval(id);
  }, []);

  // 未認証 → モーダル + /library redirect (UX として戻り先を作る)
  useEffect(() => {
    if (state === 'unauthenticated') {
      openModal();
      router.replace('/library');
    }
  }, [state, openModal, router]);

  // SavedRecipe が無い (= ハート未保存) → /library に戻す
  useEffect(() => {
    if (state !== 'idle') return;
    if (recipe === null) {
      toast.push({
        kind: 'warning',
        message: 'このレシピは保存帳にありません。先にハートを押してください。',
      });
      router.replace('/library');
    }
  }, [state, recipe, toast, router]);

  // auto-save (3 秒 debounce)
  const { lastSavedAt } = useFeedbackDraft(candidateId, form, state === 'idle' && !submitting);

  const draftHint = useMemo(() => {
    if (saved) return '前回の入力を引き継ぎました';
    if (lastSavedAt) return '入力中の内容は自動で下書き保存されます';
    return null;
  }, [saved, lastSavedAt]);

  const lastAgo = formatLastSavedAgo(lastSavedAt, nowTick);

  const handleAxisChange = (axis: FeedbackAxisKey) => (next: FeedbackScore) =>
    setForm((f) => ({ ...f, axes: { ...f.axes, [axis]: next } }));

  const handleChipChange = (group: keyof typeof FEEDBACK_CHIP_OPTIONS) => (next: string[]) =>
    setForm((f) => ({ ...f, [group]: next }));

  const handleSubmit = async (): Promise<void> => {
    if (form.overallRating === 0 || submitting) return;
    setSubmitting(true);
    try {
      await save(form);
      toast.push({ kind: 'success', message: 'ふるさとピザ帳に記録しました' });
      router.push('/journal');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      toast.push({ kind: 'warning', message: `記録に失敗しました (${msg})` });
      setSubmitting(false);
    }
  };

  const ctaDisabled = form.overallRating === 0 || submitting || state !== 'idle';
  const cookedAtText = saved
    ? new Date(saved.cookedAt).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : '今夜';

  if (status === 'loading') {
    return (
      <div className={styles.shell}>
        <div className={styles.topRow}>
          <HeaderRow title="フィードバック" rightSlot={<AvatarButton />} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <div className={styles.topRow}>
        <HeaderRow title="フィードバック" rightSlot={<AvatarButton />} />
      </div>

      <div className={styles.eyebrowRow}>
        <div className={styles.eyebrow}>作ってみた · FEEDBACK</div>
        <h1 className={styles.headline}>
          今夜の一枚は、
          <br />
          どうでしたか？
        </h1>
        {draftHint ? (
          <div className={styles.draftHint}>
            <span className={styles.draftDot} aria-hidden />
            {draftHint}
            {lastAgo ? <span className={styles.draftTime}>· {lastAgo}</span> : null}
          </div>
        ) : null}
      </div>

      {/* mini hero */}
      <div className={styles.hero}>
        <div className={styles.heroCard}>
          <div className={styles.heroImage}>
            {recipe?.imageUrl ? (
              // 70px の小さなプレビュー、Imagen の Cloud Storage URL
              // eslint-disable-next-line @next/next/no-img-element
              <img src={recipe.imageUrl} alt="" referrerPolicy="no-referrer" />
            ) : null}
          </div>
          <div className={styles.heroBody}>
            <div className={styles.heroTitle}>{recipe?.title ?? '読み込み中...'}</div>
            <div className={styles.heroMeta}>
              {cookedAtText}
              {form.guestCount ? ` · ゲスト ${form.guestCount} 名` : ''}
            </div>
            <div className={styles.starsRow}>
              <StarInput
                value={form.overallRating}
                onChange={(v) => setForm((f) => ({ ...f, overallRating: v }))}
                size={22}
              />
              {form.overallRating === 0 ? (
                <span className={styles.starsHint}>タップで総合評価</span>
              ) : null}
            </div>
          </div>
          <CameraPlaceholder />
        </div>
      </div>

      {/* guest count */}
      <div className={styles.guestCountRow}>
        <GuestCountInput
          value={form.guestCount}
          onChange={(v) => setForm((f) => ({ ...f, guestCount: v }))}
        />
      </div>

      {/* axes */}
      <div className={styles.axesCard}>
        <div className={styles.axesHeader}>
          <span className={styles.axesTitle}>観点別評価</span>
          <span className={styles.axesEn}>BY AXIS · 5 段階</span>
        </div>
        {FEEDBACK_AXIS_ORDER.map((axis) => {
          const v = form.axes[axis];
          return (
            <div key={axis} className={styles.axisRow}>
              <span className={styles.axisLabel}>{FEEDBACK_AXIS_LABELS[axis]}</span>
              <DotsInput
                value={v}
                onChange={handleAxisChange(axis)}
                label={FEEDBACK_AXIS_LABELS[axis]}
              />
              <span
                className={`${styles.axisValue} ${v === 0 ? styles['axisValue--empty'] : ''}`.trim()}
              >
                {v === 0 ? '—' : v}
              </span>
            </div>
          );
        })}
      </div>

      {/* chip groups */}
      <div className={styles.chipsArea}>
        <ChipGroup
          jpLabel="効いた点"
          enLabel="WHAT WORKED"
          options={FEEDBACK_CHIP_OPTIONS.whatWorked}
          value={form.whatWorked}
          onChange={handleChipChange('whatWorked')}
          tone="matcha"
          onCapHit={() => toast.push({ kind: 'info', message: '6 個までです' })}
        />
        <ChipGroup
          jpLabel="次は調整したい"
          enLabel="WHAT TO TUNE"
          options={FEEDBACK_CHIP_OPTIONS.whatToTune}
          value={form.whatToTune}
          onChange={handleChipChange('whatToTune')}
          tone="yamabuki"
          onCapHit={() => toast.push({ kind: 'info', message: '6 個までです' })}
        />
        <ChipGroup
          jpLabel="ゲストの反応"
          enLabel="GUEST VIBE"
          options={FEEDBACK_CHIP_OPTIONS.guestVibe}
          value={form.guestVibe}
          onChange={handleChipChange('guestVibe')}
          tone="shu"
          onCapHit={() => toast.push({ kind: 'info', message: '6 個までです' })}
        />
      </div>

      <div className={styles.ctaWrap}>
        <button
          type="button"
          className={styles.ctaButton}
          disabled={ctaDisabled}
          onClick={() => void handleSubmit()}
        >
          {saved ? '記録を更新する' : '記録して次の提案に活かす'}
        </button>
        <div className={styles.ctaHint}>
          {form.overallRating === 0
            ? '★ を 1 つ以上つけると記録できます'
            : saved
              ? '変更は自動保存されます'
              : '保存後は振り返り帳に並びます'}
        </div>
      </div>
    </div>
  );
}
