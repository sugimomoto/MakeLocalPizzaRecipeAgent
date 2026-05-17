"""agents/orchestrator.py のテスト。"""

from __future__ import annotations

import pytest

from makelocal_agent.agents.candidates_agent import CandidateLlmOutput
from makelocal_agent.agents.orchestrator import generate_three_candidates
from makelocal_agent.deps import MockLlmClient
from makelocal_agent.domain.ingredient import Ingredient
from makelocal_agent.domain.locale import Locale
from makelocal_agent.domain.stream import (
    ErrorEvent,
    SessionDoneEvent,
    SessionStartEvent,
    StreamEvent,
)


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


async def _collect(gen) -> list[StreamEvent]:  # type: ignore[no-untyped-def]
    return [e async for e in gen]


class TestOrchestratorHappyPath:
    @pytest.mark.asyncio
    async def test_emits_23_events_in_canonical_order_with_mock_client(
        self,
        locale: Locale,
        selected: list[Ingredient],
    ) -> None:
        events = await _collect(
            generate_three_candidates(
                client=MockLlmClient(),
                session_id="sess_test_abcdef",
                locale=locale,
                selected=selected,
                hints=[],
            )
        )
        # 1 (session.start) + 21 (3 candidates x 7 events) + 1 (session.done) = 23
        assert len(events) == 23
        assert isinstance(events[0], SessionStartEvent)
        assert isinstance(events[-1], SessionDoneEvent)
        # 各候補の "candidate.done" が 3 件あること
        done_count = sum(1 for e in events if e.type == "candidate.done")
        assert done_count == 3

    @pytest.mark.asyncio
    async def test_all_3_strategies_present_in_candidate_start(
        self,
        locale: Locale,
        selected: list[Ingredient],
    ) -> None:
        events = await _collect(
            generate_three_candidates(
                client=MockLlmClient(),
                session_id="sess_test_xyz123",
                locale=locale,
                selected=selected,
                hints=[],
            )
        )
        strategies = [e.strategy for e in events if e.type == "candidate.start"]
        assert sorted(strategies) == ["exploit", "explore", "tune"]

    @pytest.mark.asyncio
    async def test_session_start_strategies_match(
        self,
        locale: Locale,
        selected: list[Ingredient],
    ) -> None:
        events = await _collect(
            generate_three_candidates(
                client=MockLlmClient(),
                session_id="sess_xyz789012",
                locale=locale,
                selected=selected,
                hints=[],
            )
        )
        first = events[0]
        assert isinstance(first, SessionStartEvent)
        assert sorted(first.strategies) == ["exploit", "explore", "tune"]


class TestOrchestratorPartialFailure:
    @pytest.mark.asyncio
    async def test_one_strategy_fail_yields_error_event_and_other_2_continue(
        self,
        locale: Locale,
        selected: list[Ingredient],
    ) -> None:
        # 1 戦略 (tune) だけ失敗するクライアント (LlmClient プロトコル準拠)
        class _PartialFailClient:
            def __init__(self) -> None:
                self.call_count = 0

            async def run_structured(
                self,
                *,
                model: str,
                instruction: str,
                prompt: str,
                output_schema: type,
            ) -> CandidateLlmOutput:
                self.call_count += 1
                if "一歩外した" in instruction:
                    msg = "simulated gemini error"
                    raise RuntimeError(msg)
                return CandidateLlmOutput(
                    title=f"title-{self.call_count}",
                    concept="c",
                    keyIngredients=["x"],
                    sceneTags=["s"],
                    why="w",
                )

        spy = _PartialFailClient()

        events = await _collect(
            generate_three_candidates(
                client=spy,
                session_id="sess_partial_fail",
                locale=locale,
                selected=selected,
                hints=[],
            )
        )
        # 成功 2 戦略 x 7 + start + done = 16、失敗 1 戦略は start + ErrorEvent = 2
        # 合計 18 events (orchestrator は終了させる)
        error_events = [e for e in events if e.type == "error"]
        assert len(error_events) == 1
        assert isinstance(error_events[0], ErrorEvent)
        assert error_events[0].code == "STRATEGY_FAIL"
        assert "tune" in error_events[0].message

        # 成功 2 戦略の candidate.done が出る (1 戦略は失敗で done 出ず)
        done_events = [e for e in events if e.type == "candidate.done"]
        assert len(done_events) == 2

        # session.start と session.done は必ず出る
        assert any(isinstance(e, SessionStartEvent) for e in events)
        assert any(isinstance(e, SessionDoneEvent) for e in events)
