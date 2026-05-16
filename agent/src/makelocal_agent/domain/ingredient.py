"""Ingredient ドメイン型 — TypeScript の src/domain/ingredient.ts と semantic 同期。

- Season は 5 値 (spring/summer/autumn/winter/all-year)
- IngredientCategory は 6 値
- is_in_season は all-year を常に true として扱う
"""

from __future__ import annotations

from typing import Literal, get_args

from pydantic import BaseModel, Field

from .locale import LocaleId

type IngredientId = str

Season = Literal["spring", "summer", "autumn", "winter", "all-year"]

IngredientCategory = Literal[
    "vegetable",
    "seafood",
    "cheese",
    "grain",
    "meat",
    "fruit",
]

SEASONS: tuple[Season, ...] = get_args(Season)
INGREDIENT_CATEGORIES: tuple[IngredientCategory, ...] = get_args(IngredientCategory)


class Ingredient(BaseModel):
    """食材 1 件 (Tap2 の選択単位)。"""

    id: IngredientId = Field(min_length=1)
    localeId: LocaleId = Field(min_length=1)
    name: str = Field(min_length=1)
    searchQuery: str | None = None
    category: IngredientCategory
    seasons: list[Season] = Field(min_length=1)
    story: str | None = None


def is_season(value: object) -> bool:
    """値が Season 列挙のいずれかかを判定する。"""
    return isinstance(value, str) and value in SEASONS


def is_ingredient_category(value: object) -> bool:
    """値が IngredientCategory 列挙のいずれかかを判定する。"""
    return isinstance(value, str) and value in INGREDIENT_CATEGORIES


def is_in_season(ingredient: Ingredient, season: Season) -> bool:
    """all-year は常に true、それ以外は seasons リストに含まれているか。

    TS 側 isInSeason() と同じ挙動。
    """
    return "all-year" in ingredient.seasons or season in ingredient.seasons
