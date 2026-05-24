'use client';

/**
 * /library 画面の Client Component (Slice 7 改修)。
 *
 * - 未サインイン: SignInModal を強制 open、Modal を閉じたら / に redirect
 * - 認証中: skeleton 風の loading 表示
 * - サインイン済:
 *     items === null: 短い loading
 *     items.length === 0: 空状態 (ハート枠 + 「まだ保存したピザは…」+ 「ピザを探す」CTA)
 *     items.length >  0: HeaderRow + hero (eyebrow + headline + メタ) + CrossLink → /journal
 *                        + LibraryCard リスト (cooked badge は LibraryCard 側で対応予定)
 *
 * Slice 7:
 * - 既存 topRow + ProfileStrip を HeaderRow (Dropdown 内包の AvatarButton) に集約
 * - hero copy 「これから作る、あなたの一枚たち。」
 * - CrossLink (matcha) で /journal へ
 * - 「保存中 N 件 · うち作った M 件」のメタ表示 (M = hasFeedback の数)
 * - LibraryCard クリック → /recipes/[candidateId] へ遷移 (snapshot を sessionStorage に書く)
 */
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';

import { AvatarButton } from '@/components/auth/AvatarButton';
import { LibraryCard } from '@/components/library/LibraryCard';
import { Button } from '@/components/primitives/Button';
import { CrossLink } from '@/components/shared/CrossLink';
import { HeaderRow } from '@/components/shell/HeaderRow';
import { hasFeedback, type SavedRecipe } from '@/domain/saved-recipe';
import { useAuth } from '@/hooks/use-auth';
import { useSavedRecipe } from '@/hooks/use-saved-recipe';
import { useSavedRecipes } from '@/hooks/use-saved-recipes';
import { useSignInModal } from '@/hooks/use-sign-in-modal';
import { useToast } from '@/hooks/use-toast';
import { writePendingRecipeFromSaved } from '@/lib/saved-recipe-nav';

import styles from './LibraryClient.module.css';

function LibraryRow({
  recipe,
  onOpen,
}: {
  recipe: SavedRecipe;
  onOpen: (recipe: SavedRecipe) => void;
}): React.JSX.Element {
  const saved = useSavedRecipe(recipe.candidateId);
  const toast = useToast();
  return (
    <LibraryCard
      recipe={recipe}
      cooked={hasFeedback(recipe)}
      onSelect={() => onOpen(recipe)}
      onUnsave={async () => {
        try {
          await saved.unsave();
          toast.push({ kind: 'success', message: '保存を解除しました' });
        } catch (e) {
          const message = e instanceof Error ? e.message : '解除に失敗しました';
          toast.push({ kind: 'warning', message: `解除に失敗しました (${message})` });
        }
      }}
    />
  );
}

export function LibraryClient(): React.JSX.Element {
  const router = useRouter();
  const { status } = useAuth();
  const { items, state, error } = useSavedRecipes();
  const { isOpen, openModal } = useSignInModal();
  const toast = useToast();

  // 未サインインなら SignInModal を強制 open、Modal を閉じたら / に redirect
  useEffect(() => {
    if (status === 'unauthenticated') {
      openModal();
    }
  }, [status, openModal]);

  useEffect(() => {
    if (status === 'unauthenticated' && !isOpen) {
      router.replace('/');
    }
  }, [status, isOpen, router]);

  useEffect(() => {
    if (error) {
      toast.push({
        kind: 'warning',
        message: `保存帳の読込に失敗しました (${error.message})`,
      });
    }
  }, [error, toast]);

  const cookedCount = useMemo(
    () => (items ? items.filter((r) => hasFeedback(r)).length : 0),
    [items],
  );

  const handleOpen = (recipe: SavedRecipe): void => {
    writePendingRecipeFromSaved(recipe);
    router.push(`/recipes/${encodeURIComponent(recipe.candidateId)}`);
  };

  // 認証中 / 未サインインの中継表示
  if (status === 'loading' || state === 'loading') {
    return (
      <div className={styles.shell}>
        <div className={styles.topRow}>
          <HeaderRow title="保存帳" brand="ふるさとピザ帳" rightSlot={<AvatarButton />} />
        </div>
        <p role="status" className={styles.statusText}>
          読み込み中…
        </p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className={styles.shell}>
        <div className={styles.topRow}>
          <HeaderRow title="保存帳" brand="ふるさとピザ帳" rightSlot={<AvatarButton />} />
        </div>
      </div>
    );
  }

  // authenticated 以降
  const list = items ?? [];
  const empty = list.length === 0;

  return (
    <div className={styles.shell}>
      <div className={styles.topRow}>
        <HeaderRow title="保存帳" brand="ふるさとピザ帳" rightSlot={<AvatarButton />} />
      </div>

      <div className={styles.hero}>
        <div className={styles.eyebrow}>SAVED · 保存したアイデア</div>
        <h1 className={styles.headline}>
          これから作る、
          <br />
          あなたの一枚たち。
        </h1>
        {!empty && (
          <p className={styles.savedCount}>
            保存中 <strong>{list.length}</strong> 件{' · '}うち作った{' '}
            <span className={styles.cookedNum}>{cookedCount}</span> 件
          </p>
        )}
      </div>

      {!empty && (
        <div className={styles.crossRow}>
          <CrossLink
            to="/journal"
            label="振り返り帳へ"
            jp="振"
            en="JOURNAL"
            count={`${cookedCount} 件`}
            accent="matcha"
          />
          <span aria-hidden className={styles.divider} />
          <span className={styles.sortLabel}>新しい順</span>
        </div>
      )}

      {empty ? (
        <div className={styles.emptyWrap}>
          <div className={styles.emptyHeart} aria-hidden>
            <span>♡</span>
          </div>
          <h2 className={styles.emptyTitle}>
            まだ保存したピザは、
            <br />
            ありません。
          </h2>
          <p className={styles.emptyBody}>
            気になる一枚に出会ったら、
            <br />
            ハートで集めましょう。
          </p>
          <div className={styles.emptyCta}>
            <Button variant="shu" size="lg" onClick={() => router.push('/local')}>
              ピザを探す →
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.list}>
          {list.map((r) => (
            <LibraryRow key={r.candidateId} recipe={r} onOpen={handleOpen} />
          ))}
          <p className={styles.listTail}>── 以上、{list.length} 件 ──</p>
        </div>
      )}
    </div>
  );
}
