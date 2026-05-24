"""src/domain/recipe.py のテスト — Slice 3 詳細レシピドメイン。"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from makelocal_agent.domain.recipe import (
    RecipeDetailLlmOutput,
    RecipeMaterial,
    RecipeMeta,
)


def _meta() -> RecipeMeta:
    return RecipeMeta(servings="ピザ 1 枚分", duration="45m", bakingTemp="270°C", difficulty="★★☆")


def _materials(n: int = 5) -> list[RecipeMaterial]:
    return [RecipeMaterial(name=f"材料{i}", quantity=f"{i * 10}g") for i in range(1, n + 1)]


def _steps(n: int = 5) -> list[str]:
    return [f"ステップ{i}: 何かをする" for i in range(1, n + 1)]


class TestRecipeMaterial:
    def test_accepts_minimal_pair(self) -> None:
        m = RecipeMaterial(name="強力粉", quantity="300g")
        assert m.name == "強力粉"
        assert m.quantity == "300g"

    def test_rejects_empty_name(self) -> None:
        with pytest.raises(ValidationError):
            RecipeMaterial(name="", quantity="300g")

    def test_rejects_empty_quantity(self) -> None:
        with pytest.raises(ValidationError):
            RecipeMaterial(name="強力粉", quantity="")


class TestRecipeMeta:
    def test_accepts_typical_values(self) -> None:
        m = _meta()
        assert m.servings == "ピザ 1 枚分"
        assert m.duration == "45m"
        assert m.bakingTemp == "270°C"
        assert m.difficulty == "★★☆"

    @pytest.mark.parametrize("field", ["servings", "duration", "bakingTemp", "difficulty"])
    def test_rejects_empty_field(self, field: str) -> None:
        base = {"servings": "ピザ 1 枚分", "duration": "45m", "bakingTemp": "270°C", "difficulty": "★★☆"}
        base[field] = ""
        with pytest.raises(ValidationError):
            RecipeMeta(**base)


class TestRecipeDetailLlmOutput:
    def test_accepts_fully_populated_output(self) -> None:
        out = RecipeDetailLlmOutput(
            title="松島の牡蠣と、名取のせり。",
            meta=_meta(),
            materials=_materials(),
            steps=_steps(),
            storyEyebrow="ゲストに語る",
            storyHeadline="松島の牡蠣と、名取のせり。",
            storyBody="海と田畑が一枚に重なる、宮城の今夜。",
        )
        assert len(out.materials) == 5
        assert len(out.steps) == 5

    def test_rejects_fewer_than_3_materials(self) -> None:
        with pytest.raises(ValidationError):
            RecipeDetailLlmOutput(
                title="t",
                meta=_meta(),
                materials=_materials(2),
                steps=_steps(),
                storyEyebrow="e",
                storyHeadline="h",
                storyBody="b",
            )

    def test_rejects_fewer_than_3_steps(self) -> None:
        with pytest.raises(ValidationError):
            RecipeDetailLlmOutput(
                title="t",
                meta=_meta(),
                materials=_materials(),
                steps=_steps(2),
                storyEyebrow="e",
                storyHeadline="h",
                storyBody="b",
            )

    @pytest.mark.parametrize(
        "field",
        ["title", "storyEyebrow", "storyHeadline", "storyBody"],
    )
    def test_rejects_empty_string_field(self, field: str) -> None:
        base = {
            "title": "t",
            "meta": _meta(),
            "materials": _materials(),
            "steps": _steps(),
            "storyEyebrow": "e",
            "storyHeadline": "h",
            "storyBody": "b",
        }
        base[field] = ""
        with pytest.raises(ValidationError):
            RecipeDetailLlmOutput(**base)
