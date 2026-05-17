/**
 * RecipeHero — 詳細画面の最上部、ピザ画像 + 戻る + 保存ハートのヒーローエリア。
 *
 * - image (Slice 3: base64 data URI、Slice 4: GCS URL) がまだ無ければスケルトン
 * - 戻る (◂) / ハート (♡ / ♥) は左右に固定オーバーレイ
 * - クリック挙動は親から callback で受ける
 */

import styles from './RecipeHero.module.css';

export type RecipeHeroProps = {
  imageUrl: string | null;
  imageError: string | null;
  onBack: () => void;
  onSave: () => void;
  isSaved?: boolean;
  altText?: string;
};

export function RecipeHero({
  imageUrl,
  imageError,
  onBack,
  onSave,
  isSaved = false,
  altText = '生成されたピザの画像',
}: RecipeHeroProps) {
  return (
    <div className={styles.hero}>
      {imageUrl ? (
        // 外部 URL or data URI どちらでも素の img で良い (next/image は不要)
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={altText} className={styles.image} />
      ) : (
        <div
          className={styles.skeleton}
          role="status"
          aria-label={imageError ? '画像生成に失敗しました' : '画像生成中'}
        >
          {imageError && <span className={styles.errorBadge}>画像生成は失敗しました</span>}
        </div>
      )}

      <button type="button" className={styles.backBtn} onClick={onBack} aria-label="戻る">
        <span aria-hidden="true">‹</span>
      </button>

      <button
        type="button"
        className={[styles.heartBtn, isSaved ? styles.heartActive : null].filter(Boolean).join(' ')}
        onClick={onSave}
        aria-label={isSaved ? '保存解除' : 'ピザ帳に保存'}
        aria-pressed={isSaved}
      >
        <span aria-hidden="true">{isSaved ? '♥' : '♡'}</span>
      </button>
    </div>
  );
}
