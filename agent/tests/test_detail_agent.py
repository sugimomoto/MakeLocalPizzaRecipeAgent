"""agents/detail_agent.py の run_recipe_detail テスト。"""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest
from pydantic import BaseModel

from makelocal_agent.agents.detail_agent import (
    DETAIL_BASE_INSTRUCTION,
    run_recipe_detail,
)
from makelocal_agent.deps import MockLlmClient
from makelocal_agent.domain.candidate import Candidate
from makelocal_agent.domain.ingredient import Ingredient
from makelocal_agent.domain.locale import Locale
from makelocal_agent.domain.recipe import RecipeDetailLlmOutput, RecipeMaterial, RecipeMeta

_MIYAGI = Locale(
    id="miyagi",
    prefecture="宮城県",
    prefectureCode="JP-04",
    region="tohoku",
)


def _selected() -> list[Ingredient]:
    return [
        Ingredient.model_validate(
            {
                "id": "miyagi-seri",
                "localeId": "miyagi",
                "name": "せり",
                "category": "vegetable",
                "seasons": ["winter"],
            }
        )
    ]


def _candidate() -> Candidate:
    return Candidate(
        candidateId="c_1_abcxyz",
        strategy="exploit",
        title="松島の牡蠣ピザ",
        concept="海の旨味を素直に",
        keyIngredients=["牡蠣", "モッツァレラ"],
        sceneTags=["週末家族"],
        why="王道の組合せで失敗しない",
    )


class TestRunRecipeDetail:
    @pytest.mark.asyncio
    async def test_returns_recipe_detail_llm_output_instance(self) -> None:
        client = MockLlmClient()
        out = await run_recipe_detail(
            client=client,
            locale=_MIYAGI,
            selected=_selected(),
            candidate=_candidate(),
        )
        assert isinstance(out, RecipeDetailLlmOutput)
        assert len(out.materials) >= 3
        assert len(out.steps) >= 3
        assert isinstance(out.meta, RecipeMeta)
        assert isinstance(out.materials[0], RecipeMaterial)

    @pytest.mark.asyncio
    async def test_passes_detail_instruction_and_model(self) -> None:
        spy = AsyncMock()
        spy.run_structured = AsyncMock(
            return_value=RecipeDetailLlmOutput(
                title="t",
                meta=RecipeMeta(
                    servings="ピザ 1 枚分", duration="45m", bakingTemp="270°C", difficulty="★★☆"
                ),
                materials=[RecipeMaterial(name=f"n{i}", quantity=f"{i}g") for i in range(1, 4)],
                steps=[f"step{i}" for i in range(1, 4)],
                storyEyebrow="e",
                storyHeadline="h",
                storyBody="b",
            )
        )
        await run_recipe_detail(
            client=spy,
            locale=_MIYAGI,
            selected=_selected(),
            candidate=_candidate(),
            model="gemini-2.5-pro",
        )
        kwargs = spy.run_structured.call_args.kwargs
        assert kwargs["model"] == "gemini-2.5-pro"
        assert kwargs["instruction"] == DETAIL_BASE_INSTRUCTION
        assert kwargs["output_schema"] is RecipeDetailLlmOutput
        assert "松島の牡蠣ピザ" in kwargs["prompt"]

    @pytest.mark.asyncio
    async def test_rejects_wrong_return_type(self) -> None:
        class _Other(BaseModel):
            foo: str = "x"

        spy = AsyncMock()
        spy.run_structured = AsyncMock(return_value=_Other())
        with pytest.raises(TypeError):
            await run_recipe_detail(
                client=spy,
                locale=_MIYAGI,
                selected=_selected(),
                candidate=_candidate(),
            )
