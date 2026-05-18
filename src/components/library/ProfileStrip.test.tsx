import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ProfileStrip } from './ProfileStrip';

describe('ProfileStrip', () => {
  it('renders displayName + email + initials when no photoURL', () => {
    render(
      <ProfileStrip
        displayName="松島 一郎"
        email="matsushima@example.com"
        photoURL={null}
        onSignOut={() => {}}
      />,
    );
    expect(screen.getByText('松島 一郎')).toBeInTheDocument();
    expect(screen.getByText('matsushima@example.com')).toBeInTheDocument();
    expect(screen.getByText('松')).toBeInTheDocument();
  });

  it('renders <img> when photoURL is provided', () => {
    const { container } = render(
      <ProfileStrip
        displayName="K"
        email="k@x"
        photoURL="https://example.com/me.png"
        onSignOut={() => {}}
      />,
    );
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://example.com/me.png');
  });

  it('falls back to email local-part when displayName is null', () => {
    render(
      <ProfileStrip
        displayName={null}
        email="hello@example.com"
        photoURL={null}
        onSignOut={() => {}}
      />,
    );
    expect(screen.getByText('H')).toBeInTheDocument();
  });

  it('falls back to "？" initials and "名前未設定" when both displayName and email are null', () => {
    render(<ProfileStrip displayName={null} email={null} photoURL={null} onSignOut={() => {}} />);
    expect(screen.getByText('？')).toBeInTheDocument();
    expect(screen.getByText('名前未設定')).toBeInTheDocument();
  });

  it('invokes onSignOut when the sign-out button is clicked', async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn();
    render(<ProfileStrip displayName="K" email="k@x" photoURL={null} onSignOut={onSignOut} />);
    await user.click(screen.getByRole('button', { name: 'サインアウト' }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
