"""src/domain/ingredient.py のテスト — TS 側 src/domain/ingredient.test.ts と等価。"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from makelocal_agent.domain.ingredient import (
    INGREDIENT_CATEGORIES,
    SEASONS,
    Ingredient,
    is_in_season,
    is_ingredient_category,
    is_season,
)


class TestSeason:
    def test_contains_exactly_5_values_including_all_year(self) -> None:
        assert SEASONS == ("spring", "summer", "autumn", "winter", "all-year")
        assert len(SEASONS) == 5

    def test_is_season_rejects_unknown_values(self) -> None:
        assert is_season("spring") is True
        assert is_season("all-year") is True
        assert is_season("Spring") is False
        assert is_season("rainy") is False
        assert is_season(0) is False
        assert is_season(None) is False


class TestIngredientCategory:
    def test_contains_exactly_6_categories(self) -> None:
        assert INGREDIENT_CATEGORIES == (
            "vegetable",
            "seafood",
            "cheese",
            "grain",
            "meat",
            "fruit",
        )

    def test_is_ingredient_category_rejects_unknown(self) -> None:
        assert is_ingredient_category("seafood") is True
        assert is_ingredient_category("herb") is False
        assert is_ingredient_category(None) is False


class TestIsInSeason:
    def _seri(self) -> Ingredient:
        return Ingredient(
            id="miyagi-seri",
            localeId="miyagi",
            name="せり",
            category="vegetable",
            seasons=["winter", "spring"],
        )

    def _cheese(self) -> Ingredient:
        return Ingredient(
            id="mozzarella",
            localeId="all",
            name="モッツァレラ",
            category="cheese",
            seasons=["all-year"],
        )

    def test_returns_true_when_season_in_list(self) -> None:
        seri = self._seri()
        assert is_in_season(seri, "winter") is True
        assert is_in_season(seri, "spring") is True

    def test_returns_false_when_season_not_in_list(self) -> None:
        seri = self._seri()
        assert is_in_season(seri, "summer") is False
        assert is_in_season(seri, "autumn") is False

    def test_all_year_ingredients_are_always_in_season(self) -> None:
        cheese = self._cheese()
        for s in ("spring", "summer", "autumn", "winter"):
            assert is_in_season(cheese, s) is True


class TestIngredientShape:
    def test_search_query_and_story_are_optional(self) -> None:
        minimal = Ingredient(
            id="x",
            localeId="y",
            name="z",
            category="meat",
            seasons=["all-year"],
        )
        assert minimal.searchQuery is None
        assert minimal.story is None

    def test_rejects_empty_seasons(self) -> None:
        with pytest.raises(ValidationError):
            Ingredient(
                id="x",
                localeId="y",
                name="z",
                category="meat",
                seasons=[],
            )

    def test_rejects_unknown_category(self) -> None:
        with pytest.raises(ValidationError):
            Ingredient(
                id="x",
                localeId="y",
                name="z",
                category="spice",
                seasons=["all-year"],
            )
