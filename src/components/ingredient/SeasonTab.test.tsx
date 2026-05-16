import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CategoryTab } from './CategoryTab';
import { SeasonTab } from './SeasonTab';

describe('SeasonTab', () => {
  it('renders 5 seasons + "すべて" tab when showAll is default', () => {
    render(<SeasonTab value={null} onChange={() => undefined} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(6); // すべて + 5 seasons
    expect(tabs[0]?.textContent).toBe('すべて');
  });

  it('hides "すべて" tab when showAll=false', () => {
    render(<SeasonTab value={null} onChange={() => undefined} showAll={false} />);
    expect(screen.getAllByRole('tab')).toHaveLength(5);
  });

  it('aria-selected reflects active value', () => {
    render(<SeasonTab value="winter" onChange={() => undefined} />);
    const winter = screen.getByRole('tab', { name: /冬/ });
    expect(winter).toHaveAttribute('aria-selected', 'true');
    const spring = screen.getByRole('tab', { name: /春/ });
    expect(spring).toHaveAttribute('aria-selected', 'false');
  });

  it('clicking a season fires onChange with that season', async () => {
    const onChange = vi.fn();
    render(<SeasonTab value={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole('tab', { name: /春/ }));
    expect(onChange).toHaveBeenCalledWith('spring');
  });

  it('clicking すべて fires onChange with null', async () => {
    const onChange = vi.fn();
    render(<SeasonTab value="winter" onChange={onChange} />);
    await userEvent.click(screen.getByRole('tab', { name: 'すべて' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe('CategoryTab', () => {
  it('renders all 6 categories + "すべて"', () => {
    render(<CategoryTab value={null} onChange={() => undefined} />);
    expect(screen.getAllByRole('tab')).toHaveLength(7);
  });

  it('clicking a category fires onChange with that category', async () => {
    const onChange = vi.fn();
    render(<CategoryTab value={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole('tab', { name: /魚介/ }));
    expect(onChange).toHaveBeenCalledWith('seafood');
  });

  it('aria-selected reflects active value', () => {
    render(<CategoryTab value="cheese" onChange={() => undefined} />);
    expect(screen.getByRole('tab', { name: /チーズ/ })).toHaveAttribute('aria-selected', 'true');
  });
});
