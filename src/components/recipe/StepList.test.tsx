import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StepList } from './StepList';

describe('StepList', () => {
  it('renders skeleton when steps is null', () => {
    render(<StepList steps={null} skeletonRows={3} />);
    expect(screen.getByRole('status', { name: '手順を生成中' })).toBeInTheDocument();
    expect(screen.getByRole('status').querySelectorAll('li').length).toBe(3);
  });

  it('renders each step with zero-padded sequence number', () => {
    render(<StepList steps={['生地を伸ばす', '焼く', '盛る']} />);
    expect(screen.getByText('生地を伸ばす')).toBeInTheDocument();
    expect(screen.getByText('焼く')).toBeInTheDocument();
    expect(screen.getByText('盛る')).toBeInTheDocument();
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('02')).toBeInTheDocument();
    expect(screen.getByText('03')).toBeInTheDocument();
  });

  it('uses aria-label "手順一覧" when populated', () => {
    render(<StepList steps={['a', 'b']} />);
    expect(screen.getByLabelText('手順一覧')).toBeInTheDocument();
  });
});
