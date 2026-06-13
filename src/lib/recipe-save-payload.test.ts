import { describe, expect, it } from 'vitest';

import { buildSavePayload, type RecipeDetailSnapshotFields } from './recipe-save-payload';

import type { Candidate } from '@/domain/candidate';

const CANDIDATE: Candidate = {
  candidateId: 'c1',
  strategy: 'exploit',
  title: '王道の牡蠣ピザ',
  concept: '海の旨味を素直に',
  keyIngredients: ['牡蠣', 'モッツァレラ'],
  sceneTags: ['週末家族'],
  why: '王道だから',
};

const FULL_DETAIL: RecipeDetailSnapshotFields = {
  imageUrl: 'https://storage.test/c1.png',
  meta: { servings: 'ピザ 1 枚', duration: '45m', bakingTemp: '270°C', difficulty: '★★☆' },
  materials: [{ name: '強力粉', quantity: '300g' }],
  steps: ['生地を伸ばす', '焼く'],
  story: { eyebrow: 'ゲストに語る', headline: '松島の夜。', body: '海と山の一枚。' },
};

const baseParams = {
  candidateId: 'c1',
  title: '王道の牡蠣ピザ',
  localeId: 'miyagi',
  prefecture: '宮城県',
  ingredients: ['miyagi-kaki'],
  candidate: CANDIDATE,
};

describe('buildSavePayload', () => {
  it('builds a full snapshot including candidate and detail fields', () => {
    const payload = buildSavePayload({ ...baseParams, detail: FULL_DETAIL });

    expect(payload).toEqual({
      candidateId: 'c1',
      title: '王道の牡蠣ピザ',
      localeId: 'miyagi',
      prefecture: '宮城県',
      strategy: 'exploit',
      imageUrl: 'https://storage.test/c1.png',
      ingredients: ['miyagi-kaki'],
      concept: '海の旨味を素直に',
      keyIngredients: ['牡蠣', 'モッツァレラ'],
      sceneTags: ['週末家族'],
      why: '王道だから',
      meta: FULL_DETAIL.meta,
      materials: FULL_DETAIL.materials,
      steps: FULL_DETAIL.steps,
      story: FULL_DETAIL.story,
    });
  });

  it('omits detail keys that are still null and defaults imageUrl to empty string', () => {
    const payload = buildSavePayload({
      ...baseParams,
      detail: { imageUrl: null, meta: null, materials: null, steps: null, story: null },
    });

    expect(payload.imageUrl).toBe('');
    expect('meta' in payload).toBe(false);
    expect('materials' in payload).toBe(false);
    expect('steps' in payload).toBe(false);
    expect('story' in payload).toBe(false);
    // 候補スナップショットは常に含まれる
    expect(payload.concept).toBe('海の旨味を素直に');
    expect(payload.keyIngredients).toEqual(['牡蠣', 'モッツァレラ']);
  });
});
