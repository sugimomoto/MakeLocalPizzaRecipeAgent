import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CameraPlaceholder } from './CameraPlaceholder';

const toastPushMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ push: toastPushMock }),
}));

beforeEach(() => {
  toastPushMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CameraPlaceholder', () => {
  it('「準備中」バッジを出す', () => {
    render(<CameraPlaceholder />);
    expect(screen.getByText('準備中')).toBeTruthy();
  });

  it('クリックで info Toast', async () => {
    render(<CameraPlaceholder />);
    const user = userEvent.setup();
    await user.click(screen.getByLabelText('写真を添付 (準備中)'));
    expect(toastPushMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'info',
        message: expect.stringContaining('写真の添付'),
      }),
    );
  });
});
