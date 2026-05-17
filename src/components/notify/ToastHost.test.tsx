import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ToastHost } from './ToastHost';

describe('ToastHost', () => {
  it('renders nothing visible when items is empty (but the region is present)', () => {
    render(<ToastHost items={[]} />);
    expect(screen.getByRole('region', { name: '通知' })).toBeInTheDocument();
    expect(screen.queryAllByRole('status')).toHaveLength(0);
  });

  it('renders one Toast per item, in array order', () => {
    render(
      <ToastHost
        items={[
          { id: 'a', kind: 'success', message: 'A' },
          { id: 'b', kind: 'info', message: 'B' },
          { id: 'c', kind: 'warning', message: 'C' },
        ]}
      />,
    );
    const items = screen.getAllByRole('status');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('A');
    expect(items[1]).toHaveTextContent('B');
    expect(items[2]).toHaveTextContent('C');
  });

  it('passes the matching id to onDismiss when a toast close is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <ToastHost
        items={[
          { id: 'a', kind: 'success', message: 'A' },
          { id: 'b', kind: 'warning', message: 'B' },
        ]}
        onDismiss={onDismiss}
      />,
    );
    const closes = screen.getAllByRole('button', { name: '閉じる' });
    expect(closes).toHaveLength(2);
    await user.click(closes[1]!);
    expect(onDismiss).toHaveBeenCalledWith('b');
  });
});
