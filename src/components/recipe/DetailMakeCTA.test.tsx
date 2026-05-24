import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DetailMakeCTA } from './DetailMakeCTA';

describe('DetailMakeCTA', () => {
  it('state=ready: 作ってみるボタン enabled、ハート未押下', async () => {
    const onMake = vi.fn();
    const onHeart = vi.fn();
    render(
      <DetailMakeCTA
        state="ready"
        heartFilled={false}
        onMakeClick={onMake}
        onHeartClick={onHeart}
      />,
    );
    const make = screen.getByRole('button', { name: '作ってみる' }) as HTMLButtonElement;
    expect(make.disabled).toBe(false);
    const user = userEvent.setup();
    await user.click(make);
    expect(onMake).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'ピザ帳に保存する' }));
    expect(onHeart).toHaveBeenCalledTimes(1);
  });

  it('state=guest: 作ってみるは disabled、サインインリンク表示', async () => {
    const onSignIn = vi.fn();
    render(
      <DetailMakeCTA
        state="guest"
        heartFilled={false}
        onMakeClick={() => {}}
        onHeartClick={() => {}}
        onSignInRequest={onSignIn}
      />,
    );
    const make = screen.getByRole('button', { name: '作ってみる' }) as HTMLButtonElement;
    expect(make.disabled).toBe(true);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'サインイン' }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('state=unsaved: 「保存しなくても作れます」ヒント表示', () => {
    render(
      <DetailMakeCTA
        state="unsaved"
        heartFilled={false}
        onMakeClick={() => {}}
        onHeartClick={() => {}}
      />,
    );
    expect(screen.getByText(/保存しなくても作れます/)).toBeTruthy();
  });

  it('heartFilled=true で aria-pressed=true + label が「外す」', () => {
    render(
      <DetailMakeCTA
        state="ready"
        heartFilled={true}
        onMakeClick={() => {}}
        onHeartClick={() => {}}
      />,
    );
    const heart = screen.getByRole('button', { name: 'ピザ帳から外す' });
    expect(heart.getAttribute('aria-pressed')).toBe('true');
  });
});
