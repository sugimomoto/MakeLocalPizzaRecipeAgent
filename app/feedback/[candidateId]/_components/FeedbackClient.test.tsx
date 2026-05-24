import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FeedbackClient } from './FeedbackClient';

import type { Feedback } from '@/domain/feedback';
import type { SavedRecipe } from '@/domain/saved-recipe';

const pushMock = vi.fn();
const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock, back: vi.fn() }),
  usePathname: () => '/feedback/cand-1',
}));

const openModalMock = vi.fn();
vi.mock('@/hooks/use-sign-in-modal', () => ({
  useSignInModal: () => ({ openModal: openModalMock, close: vi.fn(), isOpen: false }),
}));

const toastPushMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ push: toastPushMock }),
}));

// useAuth: テストごとに変える
let authStatus: 'loading' | 'unauthenticated' | 'authenticated' = 'authenticated';
const authUser = { uid: 'u1', displayName: 'Kazu', email: 'k@example.com', photoURL: null };
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    status: authStatus,
    user: authStatus === 'authenticated' ? authUser : null,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}));

// useFeedback: テストごとに値を切替
let feedbackState: 'loading' | 'unauthenticated' | 'idle' = 'idle';
let savedFeedback: Feedback | null = null;
let recipe: SavedRecipe | null = null;
const saveMock = vi.fn<(...args: unknown[]) => Promise<void>>();
vi.mock('@/hooks/use-feedback', async () => {
  const { emptyFeedback } = await import('@/domain/feedback');
  return {
    useFeedback: () => ({
      state: feedbackState,
      saved: savedFeedback,
      draft: null,
      recipe,
      initial: savedFeedback
        ? {
            overallRating: savedFeedback.overallRating,
            axes: savedFeedback.axes,
            whatWorked: savedFeedback.whatWorked,
            whatToTune: savedFeedback.whatToTune,
            guestVibe: savedFeedback.guestVibe,
            guestCount: savedFeedback.guestCount,
          }
        : emptyFeedback(),
      save: saveMock,
      discardDraft: vi.fn(),
      error: null,
    }),
  };
});

// useFeedbackDraft: ノイズ排除
vi.mock('@/hooks/use-feedback-draft', () => ({
  useFeedbackDraft: () => ({ lastSavedAt: null, reset: vi.fn() }),
  readLocalDraft: () => null,
}));

function makeRecipe(over: Partial<SavedRecipe> = {}): SavedRecipe {
  return {
    candidateId: 'cand-1',
    title: 'せりと牡蠣の春一枚',
    localeId: 'miyagi',
    prefecture: '宮城県',
    strategy: 'exploit',
    imageUrl: 'https://example.com/p.png',
    savedAt: new Date(),
    ...over,
  };
}

beforeEach(() => {
  authStatus = 'authenticated';
  feedbackState = 'idle';
  savedFeedback = null;
  recipe = makeRecipe();
  pushMock.mockReset();
  replaceMock.mockReset();
  openModalMock.mockReset();
  toastPushMock.mockReset();
  saveMock.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FeedbackClient', () => {
  it('HeaderRow タイトル「フィードバック」を出す', () => {
    render(<FeedbackClient candidateId="cand-1" />);
    expect(screen.getByText('フィードバック')).toBeTruthy();
  });

  it('saved 無 → CTA は disabled + ヒント表示', () => {
    render(<FeedbackClient candidateId="cand-1" />);
    const cta = screen.getByRole('button', {
      name: /記録して次の提案に活かす/,
    }) as HTMLButtonElement;
    expect(cta.disabled).toBe(true);
    expect(screen.getByText(/★ を 1 つ以上つけると記録できます/)).toBeTruthy();
  });

  it('★ を 3 つタップで CTA が enabled', async () => {
    render(<FeedbackClient candidateId="cand-1" />);
    const user = userEvent.setup();
    // 3 つ目の★ をクリック (★ 1〜5 の 3 番目 — index 2)
    const stars = screen.getAllByRole('radio');
    await user.click(stars[2]!);
    const cta = screen.getByRole('button', {
      name: /記録して次の提案に活かす/,
    }) as HTMLButtonElement;
    await waitFor(() => expect(cta.disabled).toBe(false));
  });

  it('CTA 押下で save + Toast + /journal に遷移', async () => {
    render(<FeedbackClient candidateId="cand-1" />);
    const user = userEvent.setup();
    const stars = screen.getAllByRole('radio');
    await user.click(stars[4]!); // 5
    const cta = screen.getByRole('button', { name: /記録して次の提案に活かす/ });
    await user.click(cta);
    await waitFor(() => {
      expect(saveMock).toHaveBeenCalledTimes(1);
      expect(toastPushMock).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'success',
          message: expect.stringContaining('記録しました'),
        }),
      );
      expect(pushMock).toHaveBeenCalledWith('/journal');
    });
  });

  it('既存 feedback あり → CTA ラベルは「記録を更新する」', () => {
    savedFeedback = {
      overallRating: 4,
      axes: { taste: 4, look: 3, story: 0, again: 0 },
      whatWorked: ['見た目'],
      whatToTune: [],
      guestVibe: [],
      guestCount: 4,
      cookedAt: new Date('2026-05-12'),
      updatedAt: new Date('2026-05-12'),
    };
    render(<FeedbackClient candidateId="cand-1" />);
    expect(screen.getByText('記録を更新する')).toBeTruthy();
  });

  it('SavedRecipe 無 → warning Toast + /library にリダイレクト', () => {
    recipe = null;
    render(<FeedbackClient candidateId="cand-1" />);
    expect(toastPushMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'warning',
        message: expect.stringContaining('保存帳にありません'),
      }),
    );
    expect(replaceMock).toHaveBeenCalledWith('/library');
  });

  it('未認証 → SignInModal 起動 + /library リダイレクト', () => {
    authStatus = 'unauthenticated';
    feedbackState = 'unauthenticated';
    render(<FeedbackClient candidateId="cand-1" />);
    expect(openModalMock).toHaveBeenCalled();
    expect(replaceMock).toHaveBeenCalledWith('/library');
  });
});
