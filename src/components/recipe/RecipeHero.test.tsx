import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RecipeHero } from './RecipeHero';

describe('RecipeHero', () => {
  it('renders skeleton with aria-label "画像生成中" when imageUrl is null', () => {
    render(<RecipeHero imageUrl={null} imageError={null} onBack={() => {}} onSave={() => {}} />);
    expect(screen.getByRole('status', { name: '画像生成中' })).toBeInTheDocument();
  });

  it('renders the image when imageUrl is provided', () => {
    render(
      <RecipeHero
        imageUrl="data:image/png;base64,iVBORw0K"
        imageError={null}
        onBack={() => {}}
        onSave={() => {}}
        altText="松島の牡蠣ピザ"
      />,
    );
    const img = screen.getByAltText('松島の牡蠣ピザ');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
  });

  it('renders error badge when imageError is set and no image yet', () => {
    render(
      <RecipeHero
        imageUrl={null}
        imageError="IMAGEN_FAIL: quota"
        onBack={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.getByText('画像生成は失敗しました')).toBeInTheDocument();
  });

  it('invokes onBack and onSave when respective buttons clicked', () => {
    const onBack = vi.fn();
    const onSave = vi.fn();
    render(<RecipeHero imageUrl={null} imageError={null} onBack={onBack} onSave={onSave} />);
    fireEvent.click(screen.getByLabelText('戻る'));
    fireEvent.click(screen.getByLabelText('ピザ帳に保存'));
    expect(onBack).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('toggles heart label and aria-pressed when isSaved=true', () => {
    render(
      <RecipeHero imageUrl={null} imageError={null} onBack={() => {}} onSave={() => {}} isSaved />,
    );
    const btn = screen.getByLabelText('保存解除');
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });
});
