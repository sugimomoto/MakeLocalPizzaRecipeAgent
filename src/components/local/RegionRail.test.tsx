import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RegionRail } from './RegionRail';

describe('RegionRail', () => {
  it('renders 9 region tabs in canonical order', () => {
    render(<RegionRail active="tohoku" onJump={() => undefined} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(9);
    expect(tabs[0]?.textContent).toBe('北海道');
    expect(tabs[8]?.textContent).toBe('沖縄');
  });

  it('aria-selected reflects active region', () => {
    render(<RegionRail active="kanto" onJump={() => undefined} />);
    expect(screen.getByRole('tab', { name: '関東' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '東北' })).toHaveAttribute('aria-selected', 'false');
  });

  it('onJump fires with the region id when a tab is clicked', async () => {
    const onJump = vi.fn();
    render(<RegionRail active="tohoku" onJump={onJump} />);
    await userEvent.click(screen.getByRole('tab', { name: '中部' }));
    expect(onJump).toHaveBeenCalledWith('chubu');
  });

  it('沖縄 is a separate region (split from 九州)', async () => {
    const onJump = vi.fn();
    render(<RegionRail active="tohoku" onJump={onJump} />);
    await userEvent.click(screen.getByRole('tab', { name: '沖縄' }));
    expect(onJump).toHaveBeenCalledWith('okinawa');
  });
});
