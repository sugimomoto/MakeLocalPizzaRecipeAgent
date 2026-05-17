'use client';

/**
 * SignInModal — <dialog> ベースのサインイン Modal。
 *
 * - useSignInModal() の open/close フラグを購読し、showModal/close を呼ぶ
 * - <dialog> を使うことで backdrop / ESC / focus trap / aria-modal が自動
 * - Google サインインボタン押下 → useAuth().signInWithGoogle()
 *   - 成功時: Modal を閉じる (保存処理は呼び出し側で再 try してもらう)
 *   - 失敗時: Toast warning で通知 (popup close 等は status の遷移無しで終わる)
 *
 * デザイン: design/slice4-screens.jsx の SignInModal 定義
 *   - 24px インセット / radius 20 / handle bar / eyebrow + 大型明朝タイトル
 */
import { useEffect, useRef } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useSignInModal } from '@/hooks/use-sign-in-modal';
import { useToast } from '@/hooks/use-toast';

import { GoogleButton } from './GoogleButton';
import styles from './SignInModal.module.css';

export function SignInModal(): React.JSX.Element {
  const { isOpen, close } = useSignInModal();
  const { signInWithGoogle } = useAuth();
  const toast = useToast();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const handleGoogle = async (): Promise<void> => {
    try {
      await signInWithGoogle();
      close();
      toast.push({ kind: 'info', message: 'サインインしました。ピザ帳が使えます。' });
    } catch (e) {
      // popup を閉じた場合等は無音にしたいが、明示エラーは Toast 警告で通知
      const message = e instanceof Error ? e.message : 'サインインに失敗しました';
      // popup-closed-by-user は警告にしない (ユーザの能動的 dismiss)
      if (/popup-closed-by-user|cancelled-popup-request/.test(message)) return;
      toast.push({ kind: 'warning', message: 'サインインに失敗しました。再度お試しください。' });
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={`${styles.dialog} mlpr-washi-noise`}
      onClose={close}
      aria-labelledby="signin-modal-title"
    >
      <div className={styles.handle} aria-hidden />
      <p className={styles.eyebrow}>SIGN IN</p>
      <h2 id="signin-modal-title" className={styles.title}>
        一枚を、ピザ帳に。
      </h2>
      <p className={styles.body}>
        Google で続けると保存できます。
        <br />
        閲覧はそのまま続けられます。
      </p>

      <div className={styles.actions}>
        <GoogleButton onClick={handleGoogle} />
      </div>

      <button type="button" className={styles.dismiss} onClick={close}>
        やめる
      </button>

      <p className={styles.note}>Firestore にレシピを保存します。</p>
    </dialog>
  );
}
