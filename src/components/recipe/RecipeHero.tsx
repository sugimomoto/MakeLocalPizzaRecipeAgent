/**
 * RecipeHero — 詳細画面の最上部、ピザ画像 + 戻る + 保存ハートのヒーローエリア。
 *
 * - image (Imagen data URI) がまだ無ければスケルトン (washi の上で柔らかく脈動)
 * - 戻る (◂) / ハート (♡ / ♥) は左右に固定オーバーレイ
 * - クリック挙動は親から callback で受ける (Slice 3 では alert)
 */

import styles from './RecipeHero.module.css';

export type RecipeHeroProps = {
  imageDataUri: string | null;
  imageError: string | null;
  onBack: () => void;
  onSave: () => void;
  isSaved?: boolean;
  altText?: string;
};

export function RecipeHero({
  imageDataUri,
  imageError,
  onBack,
  onSave,
  isSaved = false,
  altText = '生成されたピザの画像',
}: RecipeHeroProps) {
  return (
    <div className={styles.hero}>
      {imageDataUri ? (
        // base64 data URI なので next/image を使わず素の img で十分 (外部最適化不要)
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageDataUri} alt={altText} className={styles.image} />
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
