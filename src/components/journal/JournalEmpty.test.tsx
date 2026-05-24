import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JournalEmpty } from './JournalEmpty';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  pushMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('JournalEmpty', () => {
  it('「まだ振り返った一枚はありません」を出す', () => {
    render(<JournalEmpty />);
    expect(screen.getByText(/まだ振り返った/)).toBeTruthy();
  });

  it('ヒントカード「まずは保存帳から」のクリックで /library に push', async () => {
    render(<JournalEmpty />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /まずは保存帳から/ }));
    expect(pushMock).toHaveBeenCalledWith('/library');
  });
});
