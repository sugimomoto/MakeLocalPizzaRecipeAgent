import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MetaStrip } from './MetaStrip';

describe('MetaStrip', () => {
  it('renders 4 placeholder cells when meta is null', () => {
    render(<MetaStrip meta={null} />);
    const dl = screen.getByLabelText('レシピの基本情報');
    expect(dl).toHaveAttribute('aria-busy', 'true');
    expect(screen.getAllByText('—').length).toBe(4);
  });

  it('renders the 4 values from meta', () => {
    render(
      <MetaStrip
        meta={{ servings: '4 人分', duration: '45m', bakingTemp: '270°C', difficulty: '★★☆' }}
      />,
    );
    expect(screen.getByText('4 人分')).toBeInTheDocument();
    expect(screen.getByText('45m')).toBeInTheDocument();
    expect(screen.getByText('270°C')).toBeInTheDocument();
    expect(screen.getByText('★★☆')).toBeInTheDocument();
    expect(screen.getByLabelText('レシピの基本情報')).toHaveAttribute('aria-busy', 'false');
  });

  it('shows the 4 fixed English labels', () => {
    render(<MetaStrip meta={null} />);
    expect(screen.getByText('SERVES')).toBeInTheDocument();
    expect(screen.getByText('TIME')).toBeInTheDocument();
    expect(screen.getByText('TEMP')).toBeInTheDocument();
    expect(screen.getByText('LEVEL')).toBeInTheDocument();
  });
});
