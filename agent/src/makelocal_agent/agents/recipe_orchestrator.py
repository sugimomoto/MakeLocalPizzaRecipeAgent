"""詳細レシピ + 画像を並列実行し、NDJSON StreamEvent を順次 yield するオーケストレータ。

設計 (design.md §6):
- asyncio.TaskGroup で detail (Gemini Flash) と image (Imagen 4) を並列起動
- 完了順に asyncio.Queue 経由で yield (テキストが先、画像が後の体験を担保)
- detail 失敗 → ErrorEvent code='RECIPE_FAIL' を流して終了
- image 失敗 → ImageErrorEvent を流す (recipe 側は継続)
- recipe.start / image.start は冒頭で 1 行ずつ yield、recipe.done は detail 完了直後
"""

from __future__ import annotations

import asyncio
import contextlib
from collections.abc import AsyncIterator

from ..deps import LlmClient
from ..domain.candidate import Candidate
from ..domain.ingredient import Ingredient
from ..domain.locale import Locale
from ..domain.stream import (
    ErrorEvent,
    ImageErrorEvent,
    ImageReadyEvent,
    ImageStartEvent,
    RecipeDoneEvent,
    RecipeMaterialsEvent,
    RecipeMetaEvent,
    RecipeStartEvent,
    RecipeStepsEvent,
    RecipeStoryEvent,
    RecipeTitleEvent,
    StreamEvent,
)
from ..lib.logging import get_logger
from ..lib.storage import StorageClient
from .detail_agent import run_recipe_detail
from .image_agent import run_image_for_candidate
from .imagen_client import ImagenClient

_SENTINEL: object = object()


async def generate_recipe_detail(
    *,
    llm_client: LlmClient,
    imagen_client: ImagenClient,
    storage_client: StorageClient,
    recipe_id: str,
    locale: Locale,
    selected: list[Ingredient],
    candidate: Candidate,
) -> AsyncIterator[StreamEvent]:
    """詳細レシピ (テキスト) + 画像を並列生成して NDJSON StreamEvent を yield する。

    Yields:
        - RecipeStartEvent, ImageStartEvent (冒頭で順番固定)
        - RecipeTitle/Meta/Materials/Steps/Story/Done (detail 成功時、5+1 件)
        - ImageReadyEvent (image 成功時、1 件)
        - ImageErrorEvent (image 失敗時、1 件 — recipe 側は継続)
        - ErrorEvent code='RECIPE_FAIL' (detail 失敗時、1 件 — image 側は yield 続行)
    """
    yield RecipeStartEvent(recipeId=recipe_id)
    yield ImageStartEvent(recipeId=recipe_id)

    queue: asyncio.Queue[StreamEvent | object] = asyncio.Queue()

    async def run_detail() -> None:
        try:
            out = await run_recipe_detail(
                client=llm_client,
                locale=locale,
                selected=selected,
                candidate=candidate,
            )
            await queue.put(RecipeTitleEvent(recipeId=recipe_id, title=out.title))
            await queue.put(RecipeMetaEvent(recipeId=recipe_id, meta=out.meta))
            await queue.put(
                RecipeMaterialsEvent(recipeId=recipe_id, materials=out.materials),
            )
            await queue.put(RecipeStepsEvent(recipeId=recipe_id, steps=out.steps))
            await queue.put(
                RecipeStoryEvent(
                    recipeId=recipe_id,
                    eyebrow=out.storyEyebrow,
                    headline=out.storyHeadline,
                    body=out.storyBody,
                ),
            )
            await queue.put(RecipeDoneEvent(recipeId=recipe_id))
        except Exception as e:
            await queue.put(ErrorEvent(code="RECIPE_FAIL", message=f"recipe failed: {e}"))

    async def run_image() -> None:
        try:
            image_url = await run_image_for_candidate(
                client=imagen_client,
                storage=storage_client,
                candidate_id=recipe_id,
                candidate_title=candidate.title,
                key_ingredients=candidate.keyIngredients,
                prefecture=locale.prefecture,
            )
            await queue.put(ImageReadyEvent(recipeId=recipe_id, url=image_url))
        except Exception as e:
            # Cloud Logging に stack を残して根因を追えるようにする
            # (NDJSON 側には IMAGEN_FAIL イベントで簡潔なメッセージのみ流す)
            get_logger().error(
                "image generation failed",
                context={
                    "recipe_id": recipe_id,
                    "candidate_title": candidate.title,
                    "error_type": type(e).__name__,
                    "error": str(e),
                },
            )
            await queue.put(
                ImageErrorEvent(
                    recipeId=recipe_id,
                    code="IMAGEN_FAIL",
                    message=f"image failed: {e}",
                ),
            )

    async def runner() -> None:
        async with asyncio.TaskGroup() as tg:
            tg.create_task(run_detail())
            tg.create_task(run_image())
        await queue.put(_SENTINEL)

    runner_task = asyncio.create_task(runner())
    try:
        while True:
            item = await queue.get()
            if item is _SENTINEL:
                break
            yield item  # type: ignore[misc]
    finally:
        if not runner_task.done():
            runner_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await runner_task
        else:
            exc = runner_task.exception()
            if exc is not None:
                raise exc
