import { test } from '@playwright/test';

/**
 * サインイン / 保存 / /library / サインアウトの拡張ジャーニー。
 *
 * 状態: **未実装** (skip)。Firebase Auth Emulator の signInWithPopup を Playwright
 * から popup 無しで完結させる仕組みが必要 (Emulator REST で fake user 作成 →
 * Web SDK の IndexedDB に注入する等)。
 *
 * Slice 5 でこの自動化を実装する。
 * 現状は手動 E2E (devcontainer + Mac Safari) でカバーしている:
 *   1. http://localhost:3000/ で「サインインしてピザ帳を開く」
 *   2. Modal → 「Google で続ける」 → Auth Emulator の fake user 選択
 *   3. AvatarButton がイニシャル円に切替 → info Toast
 *   4. /local → /ingredients → /candidates → /recipes/[id] でハート → 保存 Toast
 *   5. AvatarButton tap → /library で 1 件確認
 *   6. ハート tap で 0 件 → 空状態
 *   7. ProfileStrip でサインアウト → / にリダイレクト
 */
test.skip('signed-in journey: sign-in → save → /library → unsave → sign-out (TBD)', () => {
  // Slice 5 で実装
});
