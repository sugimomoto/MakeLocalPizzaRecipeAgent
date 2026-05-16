import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SectionLabel } from './SectionLabel';

describe('SectionLabel', () => {
  it('renders the Japanese label', () => {
    render(<SectionLabel jp="北海道" />);
    expect(screen.getByText('北海道')).toBeInTheDocument();
  });

  it('renders count when provided', () => {
    render(<SectionLabel jp="東北" count={6} />);
    expect(screen.getByLabelText('6 件')).toBeInTheDocument();
  });

  it('omits count when not provided', () => {
    render(<SectionLabel jp="関東" />);
    expect(screen.queryByLabelText(/件/)).toBeNull();
  });

  it('count={0} still renders (boundary)', () => {
    render(<SectionLabel jp="x" count={0} />);
    expect(screen.getByLabelText('0 件')).toBeInTheDocument();
  });
});
