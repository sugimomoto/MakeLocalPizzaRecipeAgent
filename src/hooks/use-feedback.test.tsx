import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeedback } from './use-feedback';

import type { Feedback, FeedbackDraft } from '@/domain/feedback';
import type { SavedRecipe } from '@/domain/saved-recipe';

const subscribeSavedRecipeMock = vi.fn();
const subscribeDraftMock = vi.fn();
const saveFeedbackMock = vi.fn<(...args: unknown[]) => Promise<void>>();
const deleteDraftMock = vi.fn<(...args: unknown[]) => Promise<void>>();

vi.mock('@/lib/firebase/client', () => ({
  getFirebaseDb: () => ({}) as unknown,
}));
vi.mock('@/lib/firebase/saved-recipe', () => ({
  subscribeSavedRecipe: (...args: unknown[]) => subscribeSavedRecipeMock(...args),
}));
vi.mock('@/lib/firebase/feedback', () => ({
  subscribeDraft: (...args: unknown[]) => subscribeDraftMock(...args),
  saveFeedback: (...args: unknown[]) => saveFeedbackMock(...args),
  deleteDraft: (...args: unknown[]) => deleteDraftMock(...args),
}));

let authState: {
  status: 'loading' | 'unauthenticated' | 'authenticated';
  user: { uid: string } | null;
} = { status: 'loading', user: null };
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ ...authState }),
}));

function makeRecipe(over: Partial<SavedRecipe> = {}): SavedRecipe {
  return {
    candidateId: 'c1',
    title: 't',
    localeId: 'miyagi',
    prefecture: '宮城県',
    strategy: 'exploit',
    imageUrl: '',
    savedAt: new Date(),
    ...over,
  };
}

function makeFeedback(over: Partial<Feedback> = {}): Feedback {
  return {
    overallRating: 4,
    axes: { taste: 4, look: 3, story: 0, again: 0 },
    whatWorked: [],
    whatToTune: [],
    guestVibe: [],
    guestCount: null,
    cookedAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

function makeDraft(over: Partial<FeedbackDraft> = {}): FeedbackDraft {
  return {
    overallRating: 2,
    axes: { taste: 2, look: 0, story: 0, again: 0 },
    updatedAt: new Date(),
    ...over,
  };
}

function Harness({ candidateId }: { candidateId: string }): React.JSX.Element {
  const r = useFeedback(candidateId);
  return (
    <>
      <span data-testid="state">{r.state}</span>
      <span data-testid="initial.rating">{r.initial.overallRating}</span>
      <span data-testid="initial.worked">{r.initial.whatWorked.join(',')}</span>
      <button onClick={() => void r.save(r.initial)}>save</button>
    </>
  );
}

beforeEach(() => {
  subscribeSavedRecipeMock.mockReset();
  subscribeDraftMock.mockReset();
  saveFeedbackMock.mockReset().mockResolvedValue(undefined);
  deleteDraftMock.mockReset().mockResolvedValue(undefined);
  authState = { status: 'loading', user: null };
  // default: subscribe は no-op unsubscribe を返す
  subscribeSavedRecipeMock.mockReturnValue(() => {});
  subscribeDraftMock.mockReturnValue(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useFeedback', () => {
  it('loading → state=loading、initial は empty', () => {
    authState = { status: 'loading', user: null };
    render(<Harness candidateId="c1" />);
    expect(screen.getByTestId('state').textContent).toBe('loading');
    expect(screen.getByTestId('initial.rating').textContent).toBe('0');
  });

  it('unauthenticated → state=unauthenticated、initial は empty', () => {
    authState = { status: 'unauthenticated', user: null };
    render(<Harness candidateId="c1" />);
    expect(screen.getByTestId('state').textContent).toBe('unauthenticated');
    expect(screen.getByTestId('initial.rating').textContent).toBe('0');
  });

  it('authenticated + saved あり → state=idle、initial = saved.feedback', async () => {
    authState = { status: 'authenticated', user: { uid: 'u1' } };
    subscribeSavedRecipeMock.mockImplementation((_db, _uid, _cid, onChange) => {
      onChange(
        makeRecipe({ feedback: makeFeedback({ overallRating: 5, whatWorked: ['見た目'] }) }),
      );
      return () => {};
    });
    render(<Harness candidateId="c1" />);
    await waitFor(() => {
      expect(screen.getByTestId('state').textContent).toBe('idle');
      expect(screen.getByTestId('initial.rating').textContent).toBe('5');
      expect(screen.getByTestId('initial.worked').textContent).toBe('見た目');
    });
  });

  it('authenticated + saved なし + draft あり → initial = draft', async () => {
    authState = { status: 'authenticated', user: { uid: 'u1' } };
    subscribeSavedRecipeMock.mockImplementation((_db, _uid, _cid, onChange) => {
      onChange(null);
      return () => {};
    });
    subscribeDraftMock.mockImplementation((_db, _uid, _cid, onChange) => {
      // draftToForm は値をそのまま渡すだけ (normalizeChipList は firestore.ts 側で実施済前提)
      onChange(makeDraft({ overallRating: 3, whatWorked: ['量', '見た目'] }));
      return () => {};
    });
    render(<Harness candidateId="c1" />);
    await waitFor(() => {
      expect(screen.getByTestId('initial.rating').textContent).toBe('3');
      expect(screen.getByTestId('initial.worked').textContent).toBe('量,見た目');
    });
  });

  it('save: 既存 feedback なしのとき isFirst=true で saveFeedback', async () => {
    authState = { status: 'authenticated', user: { uid: 'u1' } };
    subscribeSavedRecipeMock.mockImplementation((_db, _uid, _cid, onChange) => {
      onChange(makeRecipe()); // recipe あり / feedback なし
      return () => {};
    });
    render(<Harness candidateId="c1" />);
    const btn = await screen.findByText('save');
    btn.click();
    await waitFor(() => {
      expect(saveFeedbackMock).toHaveBeenCalledTimes(1);
    });
    expect(saveFeedbackMock.mock.calls[0]![4]).toEqual({ isFirst: true });
  });

  it('save: 既存 feedback ありのとき isFirst=false', async () => {
    authState = { status: 'authenticated', user: { uid: 'u1' } };
    subscribeSavedRecipeMock.mockImplementation((_db, _uid, _cid, onChange) => {
      onChange(makeRecipe({ feedback: makeFeedback() }));
      return () => {};
    });
    render(<Harness candidateId="c1" />);
    const btn = await screen.findByText('save');
    btn.click();
    await waitFor(() => {
      expect(saveFeedbackMock).toHaveBeenCalledTimes(1);
    });
    expect(saveFeedbackMock.mock.calls[0]![4]).toEqual({ isFirst: false });
  });
});
