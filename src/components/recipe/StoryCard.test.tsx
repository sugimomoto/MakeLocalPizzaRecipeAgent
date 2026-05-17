import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StoryCard } from './StoryCard';

describe('StoryCard', () => {
  it('renders skeleton when story is null', () => {
    render(<StoryCard story={null} />);
    expect(screen.getByRole('status', { name: 'ストーリーを生成中' })).toBeInTheDocument();
  });

  it('renders eyebrow / headline / body when populated', () => {
    render(
      <StoryCard
        story={{
          eyebrow: 'ゲストに語る',
          headline: '松島の牡蠣と、名取のせり。',
          body: '海と田畑が一枚に重なる、宮城の今夜。',
        }}
      />,
    );
    expect(screen.getByText('ゲストに語る')).toBeInTheDocument();
    expect(screen.getByText('松島の牡蠣と、名取のせり。')).toBeInTheDocument();
    expect(screen.getByText('海と田畑が一枚に重なる、宮城の今夜。')).toBeInTheDocument();
    expect(screen.getByLabelText('シェフからの一言')).toBeInTheDocument();
  });
});
