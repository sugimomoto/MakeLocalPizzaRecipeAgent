/**
 * ProfileStrip — /library 画面のプロフィール帯。
 *
 *  [Avatar 36px] 名前 (mincho)            [サインアウト chip]
 *                email (mono)
 *
 * design/slice4-screens.jsx の LibraryScreen profile strip 準拠。
 * - Avatar は photoURL > イニシャル の優先順
 * - サインアウトボタンは ghost chip (radius 999 + hairline border)
 */
import styles from './ProfileStrip.module.css';

export type ProfileStripProps = {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  onSignOut: () => void;
};

function getInitials(displayName: string | null, email: string | null): string {
  const name = (displayName ?? '').trim();
  if (name.length > 0) return name.slice(0, 1).toUpperCase();
  const local = (email ?? '').split('@')[0] ?? '';
  if (local.length > 0) return local.slice(0, 1).toUpperCase();
  return '？';
}

export function ProfileStrip({
  displayName,
  email,
  photoURL,
  onSignOut,
}: ProfileStripProps): React.JSX.Element {
  const initials = getInitials(displayName, email);
  return (
    <div className={styles.strip}>
      <div className={styles.avatar} aria-hidden>
        {photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoURL}
            alt=""
            className={styles.avatarImage}
            referrerPolicy="no-referrer"
            draggable={false}
          />
        ) : (
          <span className={styles.avatarInitials}>{initials}</span>
        )}
      </div>
      <div className={styles.meta}>
        <div className={styles.name}>{displayName ?? '名前未設定'}</div>
        {email && <div className={styles.email}>{email}</div>}
      </div>
      <button type="button" className={styles.signOutBtn} onClick={onSignOut}>
        サインアウト
      </button>
    </div>
  );
}
