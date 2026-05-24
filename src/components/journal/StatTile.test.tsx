import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatTile } from './StatTile';

describe('StatTile', () => {
  it('label + value + sub を出す', () => {
    render(<StatTile label="作った数" value={3} sub="保存 5 件中" />);
    expect(screen.getByText('作った数')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('保存 5 件中')).toBeTruthy();
  });

  it('sub なしでも描画できる', () => {
    render(<StatTile label="平均★" value="4.0" />);
    expect(screen.getByText('平均★')).toBeTruthy();
    expect(screen.getByText('4.0')).toBeTruthy();
  });
});
