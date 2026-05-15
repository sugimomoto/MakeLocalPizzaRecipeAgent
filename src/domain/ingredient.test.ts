import { describe, expect, it } from 'vitest';

import {
  INGREDIENT_CATEGORIES,
  isInSeason,
  isIngredientCategory,
  isSeason,
  SEASONS,
} from './ingredient';

import type { Ingredient } from './ingredient';

describe('Season', () => {
  it('contains exactly 5 values including all-year', () => {
    expect(SEASONS).toEqual(['spring', 'summer', 'autumn', 'winter', 'all-year']);
    expect(SEASONS.length).toBe(5);
  });

  it('isSeason rejects unknown values', () => {
    expect(isSeason('spring')).toBe(true);
    expect(isSeason('all-year')).toBe(true);
    expect(isSeason('Spring')).toBe(false);
    expect(isSeason('rainy')).toBe(false);
    expect(isSeason(0)).toBe(false);
  });
});

describe('IngredientCategory', () => {
  it('contains exactly 6 categories', () => {
    expect(INGREDIENT_CATEGORIES).toEqual([
      'vegetable',
      'seafood',
      'cheese',
      'grain',
      'meat',
      'fruit',
    ]);
  });

  it('isIngredientCategory rejects unknown values', () => {
    expect(isIngredientCategory('seafood')).toBe(true);
    expect(isIngredientCategory('herb')).toBe(false);
    expect(isIngredientCategory(undefined)).toBe(false);
  });
});

describe('isInSeason', () => {
  const seri: Ingredient = {
    id: 'miyagi-seri',
    localeId: 'miyagi',
    name: 'せり',
    category: 'vegetable',
    seasons: ['winter', 'spring'],
  };

  const cheese: Ingredient = {
    id: 'mozzarella',
    localeId: 'all',
    name: 'モッツァレラ',
    category: 'cheese',
    seasons: ['all-year'],
  };

  it('returns true when season is in the list', () => {
    expect(isInSeason(seri, 'winter')).toBe(true);
    expect(isInSeason(seri, 'spring')).toBe(true);
  });

  it('returns false when season is not in the list', () => {
    expect(isInSeason(seri, 'summer')).toBe(false);
    expect(isInSeason(seri, 'autumn')).toBe(false);
  });

  it('all-year ingredients are always in season', () => {
    expect(isInSeason(cheese, 'spring')).toBe(true);
    expect(isInSeason(cheese, 'summer')).toBe(true);
    expect(isInSeason(cheese, 'autumn')).toBe(true);
    expect(isInSeason(cheese, 'winter')).toBe(true);
  });

  it('Ingredient shape: searchQuery and story are optional', () => {
    const minimal: Ingredient = {
      id: 'x',
      localeId: 'y',
      name: 'z',
      category: 'meat',
      seasons: ['all-year'],
    };
    expect(minimal.searchQuery).toBeUndefined();
    expect(minimal.story).toBeUndefined();
  });
});
