import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Toast } from './Toast';

describe('Toast', () => {
  it('renders the message and "✓" icon for success', () => {
    render(<Toast kind="success" message="ピザ帳に保存しました" />);
    expect(screen.getByRole('status')).toHaveTextContent('ピザ帳に保存しました');
    expect(screen.getByRole('status')).toHaveTextContent('✓');
  });

  it('renders "ⓘ" for info and "⚠" for warning', () => {
    const { rerender } = render(<Toast kind="info" message="hi" />);
    expect(screen.getByRole('status')).toHaveTextContent('ⓘ');
    rerender(<Toast kind="warning" message="hi" />);
    expect(screen.getByRole('status')).toHaveTextContent('⚠');
  });

  it('does not render the close button when onDismiss is not provided', () => {
    render(<Toast kind="success" message="x" />);
    expect(screen.queryByRole('button', { name: '閉じる' })).not.toBeInTheDocument();
  });

  it('calls onDismiss when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<Toast kind="warning" message="x" onDismiss={onDismiss} />);

    await user.click(screen.getByRole('button', { name: '閉じる' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders ReactNode messages (not just strings)', () => {
    render(
      <Toast
        kind="success"
        message={
          <>
            <b>保存を解除しました</b>
            <span>もう一度ハートで戻せます。</span>
          </>
        }
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('保存を解除しました');
    expect(screen.getByRole('status')).toHaveTextContent('もう一度ハートで戻せます。');
  });
});
