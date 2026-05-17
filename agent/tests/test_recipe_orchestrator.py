"""agents/recipe_orchestrator.py のテスト。"""

from __future__ import annotations

from collections.abc import AsyncIterator

import pytest
from pydantic import BaseModel

from makelocal_agent.agents.imagen_client import MockImagenClient
from makelocal_agent.agents.recipe_orchestrator import generate_recipe_detail
from makelocal_agent.deps import MockLlmClient
from makelocal_agent.domain.candidate import Candidate
from makelocal_agent.domain.ingredient import Ingredient
from makelocal_agent.domain.locale import Locale
from makelocal_agent.domain.stream import (
    ErrorEvent,
    ImageErrorEvent,
    ImageReadyEvent,
    ImageStartEvent,
    RecipeDoneEvent,
    RecipeStartEvent,
    StreamEvent,
)
from makelocal_agent.lib.storage import MockStorageClient


@pytest.fixture
def locale() -> Locale:
    return Locale(
        id="miyagi",
        prefecture="宮城県",
        prefectureCode="JP-04",
        region="tohoku",
    )


@pytest.fixture
def selected() -> list[Ingredient]:
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


@pytest.fixture
def candidate() -> Candidate:
    return Candidate(
        candidateId="c_1_abcxyz",
        strategy="exploit",
        title="松島の牡蠣ピザ",
        concept="海の旨味を素直に",
        keyIngredients=["牡蠣", "モッツァレラ"],
        sceneTags=["週末家族"],
        why="王道",
    )


async def _collect(gen: AsyncIterator[StreamEvent]) -> list[StreamEvent]:
    return [e async for e in gen]


class _FailLlmClient:
    """recipe_orchestrator の detail 経路を失敗させる LlmClient。"""

    async def run_structured(
        self,
        *,
        model: str,
        instruction: str,
        prompt: str,
        output_schema: type[BaseModel],
    ) -> BaseModel:
        msg = "simulated gemini failure"
        raise RuntimeError(msg)


class _FailImagenClient:
    """recipe_orchestrator の image 経路を失敗させる ImagenClient。"""

    async def generate_image(
        self,
        *,
        model: str,
        prompt: str,
        aspect_ratio: str = "1:1",
    ) -> bytes:
        msg = "simulated imagen failure"
        raise RuntimeError(msg)


class TestRecipeOrchestratorHappyPath:
    @pytest.mark.asyncio
    async def test_emits_recipe_and_image_events(
        self,
        locale: Locale,
        selected: list[Ingredient],
        candidate: Candidate,
    ) -> None:
        events = await _collect(
            generate_recipe_detail(
                llm_client=MockLlmClient(),
                imagen_client=MockImagenClient(),
                storage_client=MockStorageClient(),
                recipe_id="r_test",
                locale=locale,
                selected=selected,
                candidate=candidate,
            )
        )
        # 最初の 2 件は固定で recipe.start / image.start
        assert isinstance(events[0], RecipeStartEvent)
        assert isinstance(events[1], ImageStartEvent)

        # ハッピーパス: recipe 6 種 (title/meta/materials/steps/story/done) + image.ready
        types = [e.type for e in events]
        for t in (
            "recipe.title",
            "recipe.meta",
            "recipe.materials",
            "recipe.steps",
            "recipe.story",
            "recipe.done",
            "image.ready",
        ):
            assert t in types, f"missing event type: {t}"

        # 合計 9 = 2 (start) + 6 (recipe) + 1 (image)
        assert len(events) == 9

    @pytest.mark.asyncio
    async def test_recipe_done_implies_all_recipe_text_events_before(
        self,
        locale: Locale,
        selected: list[Ingredient],
        candidate: Candidate,
    ) -> None:
        events = await _collect(
            generate_recipe_detail(
                llm_client=MockLlmClient(),
                imagen_client=MockImagenClient(),
                storage_client=MockStorageClient(),
                recipe_id="r_test_2",
                locale=locale,
                selected=selected,
                candidate=candidate,
            )
        )
        # recipe.done 以前に title/meta/materials/steps/story が出ていること
        types = [e.type for e in events]
        done_idx = types.index("recipe.done")
        prior = set(types[:done_idx])
        for t in (
            "recipe.title",
            "recipe.meta",
            "recipe.materials",
            "recipe.steps",
            "recipe.story",
        ):
            assert t in prior


class TestRecipeOrchestratorImageFailure:
    @pytest.mark.asyncio
    async def test_image_failure_yields_image_error_and_recipe_continues(
        self,
        locale: Locale,
        selected: list[Ingredient],
        candidate: Candidate,
    ) -> None:
        events = await _collect(
            generate_recipe_detail(
                llm_client=MockLlmClient(),
                imagen_client=_FailImagenClient(),
                storage_client=MockStorageClient(),
                recipe_id="r_img_fail",
                locale=locale,
                selected=selected,
                candidate=candidate,
            )
        )
        image_errs = [e for e in events if isinstance(e, ImageErrorEvent)]
        assert len(image_errs) == 1
        assert image_errs[0].code == "IMAGEN_FAIL"
        # recipe 側は最後まで流れる
        assert any(isinstance(e, RecipeDoneEvent) for e in events)
        # image.ready は出ない
        assert not any(isinstance(e, ImageReadyEvent) for e in events)


class TestRecipeOrchestratorRecipeFailure:
    @pytest.mark.asyncio
    async def test_recipe_failure_yields_error_event_and_image_continues(
        self,
        locale: Locale,
        selected: list[Ingredient],
        candidate: Candidate,
    ) -> None:
        events = await _collect(
            generate_recipe_detail(
                llm_client=_FailLlmClient(),
                imagen_client=MockImagenClient(),
                storage_client=MockStorageClient(),
                recipe_id="r_recipe_fail",
                locale=locale,
                selected=selected,
                candidate=candidate,
            )
        )
        errs = [e for e in events if isinstance(e, ErrorEvent)]
        assert len(errs) == 1
        assert errs[0].code == "RECIPE_FAIL"
        # image 側は最後まで流れる
        assert any(isinstance(e, ImageReadyEvent) for e in events)
        # recipe.done は出ない
        assert not any(isinstance(e, RecipeDoneEvent) for e in events)
