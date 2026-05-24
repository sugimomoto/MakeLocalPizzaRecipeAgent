'use client';

/**
 * /library 画面の Client Component。
 *
 * - 未サインイン: SignInModal を強制 open、Modal を閉じたら / に redirect
 * - 認証中: skeleton 風の loading 表示
 * - サインイン済:
 *     items === null: 短い loading
 *     items.length === 0: 空状態 (ハート枠 + 「まだ保存したピザは…」+ 「ピザを探す」CTA)
 *     items.length >  0: ScreenHero + ProfileStrip + LibraryCard リスト
 *
 * - ProfileStrip のサインアウト → useAuth.signOut() → info Toast → router.push('/')
 * - LibraryCard クリック → /recipes/[candidateId] へ遷移 (snapshot を sessionStorage に書く)
 */
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { AvatarButton } from '@/components/auth/AvatarButton';
import { LibraryCard } from '@/components/library/LibraryCard';
import { ProfileStrip } from '@/components/library/ProfileStrip';
import { Button } from '@/components/primitives/Button';
import { ScreenHero } from '@/components/primitives/ScreenHero';
import { useAuth } from '@/hooks/use-auth';
import { useSavedRecipe } from '@/hooks/use-saved-recipe';
import { useSavedRecipes } from '@/hooks/use-saved-recipes';
import { useSignInModal } from '@/hooks/use-sign-in-modal';
import { useToast } from '@/hooks/use-toast';
import { PENDING_RECIPE_KEY } from '@/lib/storage-keys';

import styles from './LibraryClient.module.css';

import type { SavedRecipe } from '@/domain/saved-recipe';

/** /recipes/[id] が PENDING_RECIPE_KEY から候補スナップショットを読み込む形式に合わせる */
function writePendingRecipeFromSaved(recipe: SavedRecipe): void {
  if (typeof window === 'undefined') return;
  const payload = {
    candidateId: recipe.candidateId,
    localeId: recipe.localeId,
    ingredients: recipe.ingredients ?? [],
    candidate: {
      candidateId: recipe.candidateId,
      strategy: recipe.strategy,
      title: recipe.title,
      // Slice 6 で SavedRecipe に candidate snapshot を追加。
      // 旧 doc (snapshot 無し) は空文字 / 空配列で fall back し、
      // /recipes 側で再生成判定 (hasFullSnapshot) が false になり
      // 強制再生成ではなく degraded 表示にすることもできるが、現状は
      // detail 再生成パスは廃止 (DetailClient 側で saved を直接 hydrate)。
      concept: recipe.concept ?? '',
      keyIngredients: recipe.keyIngredients ?? [],
      sceneTags: recipe.sceneTags ?? [],
      why: recipe.why ?? '',
    },
    // Slice 6: detail snapshot を sessionStorage 経由で DetailClient に渡す
    // (Firestore から直接拾うのではなく、/library → /recipes の遷移時に
    //  pending として一緒に運ぶ。これで DetailClient は単一のソースから読める)
    savedSnapshot:
      recipe.meta && recipe.materials && recipe.steps && recipe.story
        ? {
            meta: recipe.meta,
            materials: recipe.materials,
            steps: recipe.steps,
            story: recipe.story,
            imageUrl: recipe.imageUrl,
          }
        : undefined,
  };
  window.sessionStorage.setItem(PENDING_RECIPE_KEY, JSON.stringify(payload));
}

function LibraryRow({
  recipe,
  onOpen,
}: {
  recipe: SavedRecipe;
  onOpen: (recipe: SavedRecipe) => void;
}): React.JSX.Element {
  // useSavedRecipe を使って unsave 関数を取り出す (state は購読しない用途)
  const saved = useSavedRecipe(recipe.candidateId);
  const toast = useToast();
  return (
    <LibraryCard
      recipe={recipe}
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
  const { status, user, signOut } = useAuth();
  const { items, state, error } = useSavedRecipes();
  const { isOpen, openModal } = useSignInModal();
  const toast = useToast();

  // 未サインインなら SignInModal を強制 open、Modal を閉じたら / に redirect
  useEffect(() => {
    if (status === 'unauthenticated') {
      openModal();
    }
  }, [status, openModal]);

  // Modal を閉じたタイミングで認証されていなければ / に飛ばす
  useEffect(() => {
    if (status === 'unauthenticated' && !isOpen) {
      router.replace('/');
    }
  }, [status, isOpen, router]);

  // 購読エラーは warning Toast で
  useEffect(() => {
    if (error) {
      toast.push({
        kind: 'warning',
        message: `ピザ帳の読込に失敗しました (${error.message})`,
      });
    }
    // toast.push は安定参照前提 (useToast 内で useCallback)
  }, [error, toast]);

  const handleSignOut = async (): Promise<void> => {
    try {
      await signOut();
      toast.push({ kind: 'info', message: 'サインアウトしました。' });
      router.replace('/');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'サインアウトに失敗しました';
      toast.push({ kind: 'warning', message });
    }
  };

  const handleOpen = (recipe: SavedRecipe): void => {
    writePendingRecipeFromSaved(recipe);
    router.push(`/recipes/${encodeURIComponent(recipe.candidateId)}`);
  };

  // 認証中 / 未サインインの中継表示
  if (status === 'loading' || state === 'loading') {
    return (
      <div className={styles.shell}>
        <div className={styles.topRow}>
          <button
            type="button"
            className={styles.backBtn}
            aria-label="戻る"
            onClick={() => router.back()}
          >
            <span aria-hidden>‹</span>
          </button>
          <span className={styles.titleLabel}>ピザ帳</span>
          <AvatarButton />
        </div>
        <p role="status" className={styles.statusText}>
          読み込み中…
        </p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    // SignInModal が open される。背景はシンプルに維持。
    return (
      <div className={styles.shell}>
        <div className={styles.topRow}>
          <button
            type="button"
            className={styles.backBtn}
            aria-label="戻る"
            onClick={() => router.back()}
          >
            <span aria-hidden>‹</span>
          </button>
          <span className={styles.titleLabel}>ピザ帳</span>
          <AvatarButton />
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
        <button
          type="button"
          className={styles.backBtn}
          aria-label="戻る"
          onClick={() => router.back()}
        >
          <span aria-hidden>‹</span>
        </button>
        <span className={styles.titleLabel}>ピザ帳</span>
        <AvatarButton />
      </div>

      <ScreenHero
        eyebrow="MY LIBRARY"
        title={
          <>
            あなたの一枚を、
            <br />
            集める。
          </>
        }
      />
      {!empty && (
        <p className={styles.savedCount}>
          保存中 <strong>{list.length}</strong> 件
        </p>
      )}

      {user && (
        <div className={styles.profileWrap}>
          <ProfileStrip
            displayName={user.displayName}
            email={user.email}
            photoURL={user.photoURL}
            onSignOut={() => void handleSignOut()}
          />
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
