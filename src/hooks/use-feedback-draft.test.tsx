import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeedbackDraft, readLocalDraft } from './use-feedback-draft';

import type { FeedbackFormValue } from './use-feedback';

// firebase saveDraft をモック
const saveDraftMock = vi.fn<(...args: unknown[]) => Promise<void>>();
vi.mock('@/lib/firebase/feedback', () => ({
  saveDraft: (...args: unknown[]) => saveDraftMock(...args),
}));
vi.mock('@/lib/firebase/client', () => ({
  getFirebaseDb: () => ({}) as unknown,
}));

// useAuth は test ごとに変える
let authUser: { uid: string } | null = null;
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: authUser, status: authUser ? 'authenticated' : 'unauthenticated' }),
}));

const EMPTY: FeedbackFormValue = {
  overallRating: 0,
  axes: { taste: 0, look: 0, story: 0, again: 0 },
  whatWorked: [],
  whatToTune: [],
  guestVibe: [],
  guestCount: null,
};

function Harness({
  values,
  candidateId,
}: {
  values: FeedbackFormValue;
  candidateId: string;
}): React.JSX.Element {
  const { lastSavedAt } = useFeedbackDraft(candidateId, values);
  return <span data-testid="last">{lastSavedAt ? lastSavedAt.toISOString() : 'null'}</span>;
}

describe('useFeedbackDraft', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    saveDraftMock.mockReset();
    saveDraftMock.mockResolvedValue(undefined);
    authUser = null;
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('3 秒経過後に saveDraft + localStorage mirror (サインイン済)', async () => {
    authUser = { uid: 'uid-1' };
    const values: FeedbackFormValue = { ...EMPTY, overallRating: 3 };
    render(<Harness values={values} candidateId="cand-1" />);
    expect(saveDraftMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(3000);
    // saveDraft 呼び出し
    expect(saveDraftMock).toHaveBeenCalledTimes(1);
    expect(saveDraftMock.mock.calls[0]![2]).toBe('cand-1');
    expect(saveDraftMock.mock.calls[0]![3]).toEqual(values);
    // localStorage mirror
    expect(window.localStorage.getItem('mlpr.feedbackDraft.cand-1.v1')).toBe(
      JSON.stringify(values),
    );
  });

  it('未サインインなら localStorage だけ更新、Firestore は触らない', async () => {
    authUser = null;
    render(<Harness values={{ ...EMPTY, overallRating: 4 }} candidateId="cand-2" />);
    await vi.advanceTimersByTimeAsync(3000);
    expect(saveDraftMock).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('mlpr.feedbackDraft.cand-2.v1')).toBeTruthy();
  });

  it('同じ値の再 render では debounce タイマー再起動しない (差分なしスキップ)', async () => {
    authUser = { uid: 'uid-1' };
    const v: FeedbackFormValue = { ...EMPTY, overallRating: 5 };
    const { rerender } = render(<Harness values={v} candidateId="cand-3" />);
    await vi.advanceTimersByTimeAsync(3000);
    expect(saveDraftMock).toHaveBeenCalledTimes(1);
    saveDraftMock.mockClear();
    // 同じ値で再 render
    rerender(<Harness values={{ ...v }} candidateId="cand-3" />);
    await vi.advanceTimersByTimeAsync(5000);
    expect(saveDraftMock).not.toHaveBeenCalled();
  });

  it('debounce 中に値が変わるとタイマーがリセットされる (最後の値のみ送る)', async () => {
    authUser = { uid: 'uid-1' };
    const { rerender } = render(
      <Harness values={{ ...EMPTY, overallRating: 1 }} candidateId="cand-4" />,
    );
    await vi.advanceTimersByTimeAsync(1000); // 1s 経過
    rerender(<Harness values={{ ...EMPTY, overallRating: 4 }} candidateId="cand-4" />);
    await vi.advanceTimersByTimeAsync(2000); // 累計 3s だが新タイマーは 2s で発火しない
    expect(saveDraftMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000); // 新タイマー 3s 経過
    expect(saveDraftMock).toHaveBeenCalledTimes(1);
    expect((saveDraftMock.mock.calls[0]![3] as FeedbackFormValue).overallRating).toBe(4);
  });

  it('saveDraft 成功後 lastSavedAt が反映される', async () => {
    authUser = { uid: 'uid-1' };
    render(<Harness values={{ ...EMPTY, overallRating: 2 }} candidateId="cand-5" />);
    expect(screen.getByTestId('last').textContent).toBe('null');
    await vi.advanceTimersByTimeAsync(3000);
    // Promise の解決を待つ
    await vi.runAllTimersAsync();
    expect(screen.getByTestId('last').textContent).not.toBe('null');
  });

  it('readLocalDraft で localStorage から復元できる', () => {
    const v: FeedbackFormValue = { ...EMPTY, overallRating: 3, whatWorked: ['見た目'] };
    window.localStorage.setItem('mlpr.feedbackDraft.cand-x.v1', JSON.stringify(v));
    const got = readLocalDraft('cand-x');
    expect(got).toEqual(v);
  });

  it('readLocalDraft で localStorage に無ければ null', () => {
    expect(readLocalDraft('nothing')).toBeNull();
  });
});
