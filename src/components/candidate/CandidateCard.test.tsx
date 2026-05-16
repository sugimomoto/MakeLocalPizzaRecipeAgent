import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CandidateCard } from './CandidateCard';

import type { PartialCandidate } from '@/hooks/use-quicktap-stream';

const FULL: PartialCandidate = {
  candidateId: 'c1',
  strategy: 'exploit',
  title: '王道ピザ',
  concept: '冬の松島湾を一枚に',
  keyIngredients: ['牡蠣', 'せり', 'モッツァレラ'],
  sceneTags: ['ワインに合う'],
  why: '過去FBの傾向に沿った堅実な組合せ',
  isDone: true,
};

const PARTIAL: PartialCandidate = {
  candidateId: 'c2',
  strategy: 'tune',
  isDone: false,
};

describe('CandidateCard', () => {
  it('renders all fields when candidate is fully populated', () => {
    render(<CandidateCard candidate={FULL} />);
    expect(screen.getByRole('heading', { name: '王道ピザ' })).toBeInTheDocument();
    expect(screen.getByText('冬の松島湾を一枚に')).toBeInTheDocument();
    expect(screen.getByText('牡蠣')).toBeInTheDocument();
    expect(screen.getByText('せり')).toBeInTheDocument();
    expect(screen.getByText('ワインに合う')).toBeInTheDocument();
    expect(screen.getByText('過去FBの傾向に沿った堅実な組合せ')).toBeInTheDocument();
  });

  it('shows StrategySeal for the candidate strategy', () => {
    render(<CandidateCard candidate={FULL} />);
    expect(screen.getByRole('img', { name: /王道.*EXPLOIT/ })).toBeInTheDocument();
  });

  it('shows skeletons when title and concept are missing', () => {
    render(<CandidateCard candidate={PARTIAL} />);
    expect(screen.getByRole('status', { name: 'タイトル生成中' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'コンセプト生成中' })).toBeInTheDocument();
  });

  it('shows done indicator only when isDone', () => {
    const { rerender } = render(<CandidateCard candidate={PARTIAL} />);
    expect(screen.queryByLabelText('決定可能')).toBeNull();
    rerender(<CandidateCard candidate={FULL} />);
    expect(screen.getByLabelText('決定可能')).toBeInTheDocument();
  });

  it('hides chip rows when arrays are empty/missing', () => {
    render(<CandidateCard candidate={PARTIAL} />);
    expect(screen.queryByLabelText('主な食材')).toBeNull();
    expect(screen.queryByLabelText('シーンタグ')).toBeNull();
  });

  it('renders as a button and fires onSelect when clicked', async () => {
    const onSelect = vi.fn();
    render(<CandidateCard candidate={FULL} onSelect={onSelect} />);
    const btn = screen.getByRole('button');
    await userEvent.click(btn);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('renders as a div (non-interactive) when onSelect is omitted', () => {
    render(<CandidateCard candidate={FULL} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
