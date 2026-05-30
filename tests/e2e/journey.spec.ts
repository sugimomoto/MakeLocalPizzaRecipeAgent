import { expect, test } from '@playwright/test';

/**
 * Slice 3 までの主要ジャーニーを 1 本通して、ハイドレーション / ナビゲーション /
 * NDJSON ストリーム / 状態更新の回帰を実ブラウザで検出する。
 *
 * 摘める典型: 「クリックしても反応しない」「画面遷移しない」「候補が出ない」
 *  「決めるボタンが活性化しない」「詳細画面のレンダリングが詰まる」など。
 *
 * 摘めない: dev サーバ特有のバンドル肥大 / ポートフォワード切れ
 *  (E2E は production build = `pnpm start` 経由で走るため、本症状は再現しない)。
 *
 * 前提: AGENT_MODE=mock (playwright.config.ts で固定)。
 */
test('locale → ingredients → candidates → recipe detail を 1 本通せる', async ({ page }) => {
  // ── Step 1: /local で宮城県を選ぶ ──
  await page.goto('/local');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('地元');

  await page.getByRole('button', { name: '宮城県' }).click();
  await expect(page).toHaveURL(/\/ingredients(\?|$)/);

  // ── Step 2: /ingredients で 2 つ食材を選ぶ ──
  // 食材は静的データ由来 (mock agent 不要のため) なので名前は安定している。
  await expect(page.getByRole('heading', { level: 1 })).toContainText('主役にしたい食材');

  await page.getByRole('button', { name: /せり\(根付き\)/ }).click();
  await page.getByRole('button', { name: /^牡蠣/ }).click();

  // 「AIに 3 案つくらせる ✦」CTA が活性化したらクリック
  const goCta = page.getByRole('button', { name: /AIに\s*3\s*案つくらせる/ });
  await expect(goCta).toBeEnabled();
  await goCta.click();

  // ── Step 3: /candidates で 3 案ストリームを待つ ──
  await expect(page).toHaveURL(/\/candidates\//);

  // mock agent はトータル 23 events を ~5-9s で流す。最初の候補 title が
  // 出れば「この一枚に決める」ボタンが具体的な title 入りになる。
  const decideCta = page.getByRole('button', { name: /に決める\s*→/ });
  await expect(decideCta).toBeEnabled({ timeout: 20_000 });
  await decideCta.click();

  // ── Step 4: /recipes/[id] で詳細レシピが描画される ──
  await expect(page).toHaveURL(/\/recipes\//);

  // recipe.title が NDJSON 経由で入ると <h1> に出る
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });

  // 「食 材」「手 順」のセクションラベルが出れば materials/steps event が届いた合図
  await expect(page.getByText('食 材')).toBeVisible();
  await expect(page.getByText('手 順')).toBeVisible();

  // Slice 4 で旧「ピザ帳に保存」alert ボタンは削除済 (ハート + Firestore に統合)。
  // Slice 7 で DetailMakeCTA カード (案 A) が **上部 + 下部の 2 箇所**に同一の
  // state / handler で配置された (DetailClient.tsx の L354 上部 / L378 下部)。
  // どちらの "作ってみる" ボタン / "ピザ帳に保存する" ハートも DOM に 2 つずつ存在
  // するため、strict mode violation を避けて `.first()` で受ける。
  // RecipeHero ハート (画像オーバーレイ / aria-label「ピザ帳に保存」exact) は 1 つだけ。
  await expect(page.getByRole('button', { name: /作ってみる/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'ピザ帳に保存', exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'ピザ帳に保存する', exact: true }).first(),
  ).toBeVisible();
});
