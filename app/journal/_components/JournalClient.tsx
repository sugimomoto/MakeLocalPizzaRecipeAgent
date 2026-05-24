'use client';

/**
 * JournalClient — /journal 振り返り帳 (Slice 7)
 *
 * - HeaderRow (タイトル「振り返り帳」, brand「ふるさとピザ帳」) + AvatarButton
 * - eyebrow「JOURNAL · 作った 1 枚たち」+ headline「焼き上がった、あなたの記憶。」
 * - StatTile × 3 (作った数 / 平均★ / 効いた点トップ)
 * - CrossLink (→ 保存帳)
 * - JournalCard 一覧 (cookedAt 降順)
 * - 0 件 → JournalEmpty
 * - 未認証 → unauthCard
 */

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, type JSX } from 'react';

import { AvatarButton } from '@/components/auth/AvatarButton';
import { JournalCard } from '@/components/journal/JournalCard';
import { JournalEmpty } from '@/components/journal/JournalEmpty';
import { StatTile } from '@/components/journal/StatTile';
import { CrossLink } from '@/components/shared/CrossLink';
import { HeaderRow } from '@/components/shell/HeaderRow';
import { useSavedRecipes } from '@/hooks/use-saved-recipes';
import { useSavedRecipesJournal } from '@/hooks/use-saved-recipes-journal';
import { useSignInModal } from '@/hooks/use-sign-in-modal';
import { useToast } from '@/hooks/use-toast';

import styles from './JournalClient.module.css';

import type { SavedRecipe } from '@/domain/saved-recipe';

function averageRating(items: SavedRecipe[]): string {
  if (items.length === 0) return '—';
  const sum = items.reduce((acc, r) => acc + (r.feedback?.overallRating ?? 0), 0);
  return (sum / items.length).toFixed(1);
}

function topWorkedTag(items: SavedRecipe[]): { tag: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const r of items) {
    for (const w of r.feedback?.whatWorked ?? []) {
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  let best: { tag: string; count: number } | null = null;
  for (const [tag, count] of counts) {
    if (!best || count > best.count) best = { tag, count };
  }
  return best;
}

export function JournalClient(): JSX.Element {
  const router = useRouter();
  const toast = useToast();
  const { openModal } = useSignInModal();
  const { state, items, error } = useSavedRecipesJournal();
  // /library との「保存中 N 件」表示用に、全 saved の数も取る
  const all = useSavedRecipes();

  useEffect(() => {
    if (error) {
      toast.push({
        kind: 'warning',
        message: `振り返り帳の読込に失敗しました (${error.message})`,
      });
    }
  }, [error, toast]);

  const stats = useMemo(() => {
    if (!items)
      return {
        cooked: 0,
        avg: '—',
        topWorked: null as { tag: string; count: number } | null,
        savedCount: 0,
      };
    return {
      cooked: items.length,
      avg: averageRating(items),
      topWorked: topWorkedTag(items),
      savedCount: all.items?.length ?? items.length,
    };
  }, [items, all.items]);

  // 振り返り帳のカードクリック = 「入力した内容を確認 / 編集」が主用途。
  // /recipes (詳細レシピ) に飛ばすと feedback が見えないので、既存入力を読み込んで
  // 編集できる /feedback 画面に直接遷移する (Slice 7 後修正)。
  const handleOpen = (recipe: SavedRecipe): void => {
    router.push(`/feedback/${encodeURIComponent(recipe.candidateId)}`);
  };

  // 認証中
  if (state === 'loading') {
    return (
      <div className={styles.shell}>
        <div className={styles.topRow}>
          <HeaderRow title="振り返り帳" brand="ふるさとピザ帳" rightSlot={<AvatarButton />} />
        </div>
        <div className={styles.loading} role="status">
          読み込み中…
        </div>
      </div>
    );
  }

  // 未サインイン
  if (state === 'unauthenticated') {
    return (
      <div className={styles.shell}>
        <div className={styles.topRow}>
          <HeaderRow title="振り返り帳" brand="ふるさとピザ帳" rightSlot={<AvatarButton />} />
        </div>
        <div className={styles.unauthCard}>
          <p className={styles.unauthHeadline}>振り返り帳はサインインが必要です</p>
          <p className={styles.unauthBody}>
            「作ってみた」の記録はあなただけのものです。
            <br />
            Google アカウントでサインインして使い始めましょう。
          </p>
          <button type="button" className={styles.unauthCta} onClick={() => openModal()}>
            サインインする
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <div className={styles.topRow}>
        <HeaderRow title="振り返り帳" brand="ふるさとピザ帳" rightSlot={<AvatarButton />} />
      </div>

      <div className={styles.hero}>
        <div className={styles.eyebrow}>JOURNAL · 作った 1 枚たち</div>
        <h1 className={styles.headline}>
          焼き上がった、
          <br />
          あなたの記憶。
        </h1>
      </div>

      <div className={styles.statRow}>
        <StatTile
          label="作った数"
          value={stats.cooked}
          sub={`保存 ${stats.savedCount} 件中`}
          accent="matcha"
        />
        <StatTile
          label="平均 ★"
          value={stats.avg}
          sub={stats.cooked === 0 ? '未記録' : `${stats.cooked} 枚を集計`}
          accent="yamabuki"
        />
        <StatTile
          label="効いた点"
          value={stats.topWorked?.tag ?? '—'}
          sub={stats.topWorked ? `で ${stats.topWorked.count} 件` : '未記録'}
          accent="shu"
        />
      </div>

      <div className={styles.crossRow}>
        <CrossLink
          to="/library"
          label="保存帳へ"
          jp="保"
          en="SAVED"
          count={`${all.items?.length ?? 0} 件`}
          accent="shu"
        />
        <span aria-hidden className={styles.divider} />
        <span className={styles.sortLabel}>新しい順</span>
      </div>

      {items === null || items.length === 0 ? (
        <JournalEmpty />
      ) : (
        <div className={styles.list}>
          {items.map((r) => (
            <JournalCard key={r.candidateId} recipe={r} onOpen={handleOpen} />
          ))}
        </div>
      )}
    </div>
  );
}
