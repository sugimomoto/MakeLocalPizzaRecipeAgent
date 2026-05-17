"""3 戦略を並列実行して NDJSON StreamEvent を順次 yield するオーケストレータ。

設計 (design.md §5.3):
- asyncio.TaskGroup で 3 戦略を同時に起動
- 完了順に asyncio.Queue 経由で yield (速い戦略から表示できる UX)
- 1 戦略が失敗しても残り 2 戦略は流す (best-effort、ErrorEvent を 1 行 yield)
- session.start / session.done を最初・最後に必ず yield
"""

from __future__ import annotations

import asyncio
import contextlib
from collections.abc import AsyncIterator
from typing import TYPE_CHECKING

from ..deps import LlmClient
from ..domain.candidate import STRATEGIES, Strategy
from ..domain.ingredient import Ingredient
from ..domain.locale import Locale
from ..domain.stream import (
    CandidateConceptEvent,
    CandidateDoneEvent,
    CandidateIngredientsEvent,
    CandidateSceneTagsEvent,
    CandidateStartEvent,
    CandidateTitleEvent,
    CandidateWhyEvent,
    ErrorEvent,
    SessionDoneEvent,
    SessionStartEvent,
    StreamEvent,
)
from .candidates_agent import run_candidate
from .prompt import build_prompt

if TYPE_CHECKING:
    pass


_SENTINEL: object = object()


async def generate_three_candidates(
    *,
    client: LlmClient,
    session_id: str,
    locale: Locale,
    selected: list[Ingredient],
    hints: list[Ingredient],
) -> AsyncIterator[StreamEvent]:
    """3 戦略を並列に実行して NDJSON StreamEvent を順次 yield する。

    Yields:
        - SessionStartEvent
        - 各戦略の candidate.start → title → concept → ingredients → sceneTags → why → done
          (戦略 3 x イベント 7 = 21 件、完了順に並ぶ)
        - 1 戦略が失敗した場合は ErrorEvent (code='STRATEGY_FAIL') を 1 行
        - 最後に SessionDoneEvent
    """
    yield SessionStartEvent(sessionId=session_id, strategies=list(STRATEGIES))

    queue: asyncio.Queue[StreamEvent | object] = asyncio.Queue()
    prompt = build_prompt(locale=locale, selected=selected, hints=hints)

    async def run_one(strategy: Strategy, idx: int) -> None:
        candidate_id = f"c_{idx}_{session_id[-6:]}"
        try:
            await queue.put(CandidateStartEvent(strategy=strategy, candidateId=candidate_id))
            out = await run_candidate(client=client, strategy=strategy, prompt=prompt)
            await queue.put(CandidateTitleEvent(candidateId=candidate_id, title=out.title))
            await queue.put(CandidateConceptEvent(candidateId=candidate_id, concept=out.concept))
            await queue.put(
                CandidateIngredientsEvent(
                    candidateId=candidate_id, ingredients=out.keyIngredients
                )
            )
            await queue.put(
                CandidateSceneTagsEvent(candidateId=candidate_id, sceneTags=out.sceneTags)
            )
            await queue.put(CandidateWhyEvent(candidateId=candidate_id, why=out.why))
            await queue.put(CandidateDoneEvent(candidateId=candidate_id))
        except Exception as e:
            await queue.put(
                ErrorEvent(
                    code="STRATEGY_FAIL",
                    message=f"strategy={strategy} failed: {e}",
                )
            )

    async def runner() -> None:
        async with asyncio.TaskGroup() as tg:
            for i, s in enumerate(STRATEGIES, start=1):
                tg.create_task(run_one(s, i))
        # 全タスク完了 → sentinel を入れて drain を終了させる
        await queue.put(_SENTINEL)

    runner_task = asyncio.create_task(runner())
    try:
        while True:
            item = await queue.get()
            if item is _SENTINEL:
                break
            # item は _SENTINEL でないので必ず StreamEvent
            yield item  # type: ignore[misc]
    finally:
        # runner_task が例外で終わった場合に伝搬させる
        if not runner_task.done():
            runner_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await runner_task
        else:
            # 完了済みの場合、例外があれば取り出す
            exc = runner_task.exception()
            if exc is not None:
                raise exc

    yield SessionDoneEvent(sessionId=session_id)
