import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FurusatoSkeleton } from './FurusatoSkeleton';
import { RakutenCredit } from './RakutenCredit';

describe('FurusatoSkeleton', () => {
  it('exposes role=status with accessible label', () => {
    render(<FurusatoSkeleton />);
    expect(screen.getByRole('status', { name: /読み込み中/ })).toBeInTheDocument();
  });
});

describe('RakutenCredit', () => {
  it('shows the mandatory rakuten attribution text', () => {
    render(<RakutenCredit />);
    expect(screen.getByText('POWERED BY 楽天ウェブサービス')).toBeInTheDocument();
  });
});
