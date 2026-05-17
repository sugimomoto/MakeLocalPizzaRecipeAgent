import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MaterialList } from './MaterialList';

describe('MaterialList', () => {
  it('renders skeleton rows when items is null', () => {
    render(<MaterialList items={null} skeletonRows={4} />);
    expect(screen.getByRole('status', { name: '材料を生成中' })).toBeInTheDocument();
    expect(screen.getByRole('status').querySelectorAll('li').length).toBe(4);
  });

  it('renders each material name and quantity when items provided', () => {
    render(
      <MaterialList
        items={[
          { name: '強力粉', quantity: '300g' },
          { name: '牡蠣', quantity: '10 個' },
          { name: 'モッツァレラ', quantity: '200g' },
        ]}
      />,
    );
    expect(screen.getByText('強力粉')).toBeInTheDocument();
    expect(screen.getByText('300g')).toBeInTheDocument();
    expect(screen.getByText('牡蠣')).toBeInTheDocument();
    expect(screen.getByText('10 個')).toBeInTheDocument();
    expect(screen.getByText('モッツァレラ')).toBeInTheDocument();
    expect(screen.getByText('200g')).toBeInTheDocument();
  });

  it('uses aria-label "材料一覧" when populated', () => {
    render(<MaterialList items={[{ name: '塩', quantity: '少々' }]} />);
    expect(screen.getByLabelText('材料一覧')).toBeInTheDocument();
  });
});
