"""ingredients.yaml をロードして Pydantic モデルに変換するリポジトリ。

- 起動時に 1 回だけロード (lazy + キャッシュ)
- TS 側 scripts/build-ingredient-data.ts の Zod 検証と同じスキーマを再実装
- locale 検索・filter ヘルパを提供
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel

from ..domain.ingredient import (
    Ingredient,
    IngredientCategory,
    Season,
)
from ..domain.locale import City, Locale


class _IngredientYaml(BaseModel):
    """YAML 内 1 食材の生表現。Ingredient (localeId 含む) に変換する前段。"""

    id: str
    name: str
    searchQuery: str | None = None
    category: IngredientCategory
    seasons: list[Season]
    story: str | None = None


class _LocaleYaml(Locale):
    """YAML 1 locale。Locale を継承 + ingredients を追加 (内部表現)。"""

    cities: list[City] | None = None
    ingredients: list[_IngredientYaml]


class _IngredientsYamlRoot(BaseModel):
    locales: list[_LocaleYaml]


class IngredientsRepository:
    """全 locale + 全 ingredient を保持し、検索 API を提供する。"""

    def __init__(self, locales: list[Locale], ingredients_by_locale: dict[str, list[Ingredient]]):
        self._locales = locales
        self._by_locale = ingredients_by_locale

    @classmethod
    def from_yaml(cls, yaml_path: str | Path) -> IngredientsRepository:
        path = Path(yaml_path)
        text = path.read_text(encoding="utf-8")
        raw: Any = yaml.safe_load(text)
        parsed = _IngredientsYamlRoot.model_validate(raw)

        locales: list[Locale] = []
        by_locale: dict[str, list[Ingredient]] = {}
        for loc_yaml in parsed.locales:
            locale = Locale(
                id=loc_yaml.id,
                prefecture=loc_yaml.prefecture,
                prefectureCode=loc_yaml.prefectureCode,
                region=loc_yaml.region,
                cities=loc_yaml.cities,
            )
            locales.append(locale)
            by_locale[loc_yaml.id] = [
                Ingredient(
                    id=ing.id,
                    localeId=loc_yaml.id,
                    name=ing.name,
                    searchQuery=ing.searchQuery,
                    category=ing.category,
                    seasons=ing.seasons,
                    story=ing.story,
                )
                for ing in loc_yaml.ingredients
            ]
        return cls(locales, by_locale)

    def list_locales(self) -> list[Locale]:
        return list(self._locales)

    def find_locale(self, locale_id: str) -> Locale | None:
        return next((loc for loc in self._locales if loc.id == locale_id), None)

    def list_ingredients(self, locale_id: str) -> list[Ingredient] | None:
        return self._by_locale.get(locale_id)

    def find_ingredient(self, ingredient_id: str) -> Ingredient | None:
        for items in self._by_locale.values():
            for ing in items:
                if ing.id == ingredient_id:
                    return ing
        return None
