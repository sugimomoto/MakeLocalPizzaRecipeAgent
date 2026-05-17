import { describe, expect, it } from 'vitest';

import type { RecipeMaterial, RecipeMeta, RecipeStory } from './recipe';

describe('RecipeMaterial type shape', () => {
  it('allows the minimal { name, quantity } object', () => {
    const m: RecipeMaterial = { name: '強力粉', quantity: '300g' };
    expect(m.name).toBe('強力粉');
    expect(m.quantity).toBe('300g');
  });
});

describe('RecipeMeta type shape', () => {
  it('allows all 4 display strings', () => {
    const meta: RecipeMeta = {
      servings: '4 人分',
      duration: '45m',
      bakingTemp: '270°C',
      difficulty: '★★☆',
    };
    expect(Object.keys(meta).sort()).toEqual(
      ['bakingTemp', 'difficulty', 'duration', 'servings'].sort(),
    );
  });
});

describe('RecipeStory type shape', () => {
  it('allows eyebrow / headline / body', () => {
    const s: RecipeStory = {
      eyebrow: 'ゲストに語る',
      headline: '松島の牡蠣と、名取のせり。',
      body: '海と田畑が一枚に重なる、宮城の今夜。',
    };
    expect(s.headline.length).toBeGreaterThan(0);
  });
});
