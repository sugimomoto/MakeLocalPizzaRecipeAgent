"""agents/candidates_agent.py のテスト — MockLlmClient で run_candidate を呼ぶ。"""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest
from pydantic import BaseModel

from makelocal_agent.agents.candidates_agent import (
    STRATEGY_INSTRUCTION,
    CandidateLlmOutput,
    run_candidate,
)
from makelocal_agent.deps import MockLlmClient


class TestStrategyInstruction:
    def test_has_entry_for_each_strategy(self) -> None:
        for s in ("exploit", "tune", "explore"):
            assert s in STRATEGY_INSTRUCTION
            assert len(STRATEGY_INSTRUCTION[s]) > 0


class TestRunCandidate:
    @pytest.mark.asyncio
    async def test_returns_candidate_llm_output_instance(self) -> None:
        client = MockLlmClient()
        out = await run_candidate(client=client, strategy="exploit", prompt="dummy")
        assert isinstance(out, CandidateLlmOutput)

    @pytest.mark.asyncio
    async def test_passes_strategy_specific_instruction_to_client(self) -> None:
        spy = AsyncMock()
        spy.run_structured = AsyncMock(
            return_value=CandidateLlmOutput(
                title="x",
                concept="y",
                keyIngredients=["a"],
                sceneTags=["s"],
                why="z",
            )
        )
        await run_candidate(client=spy, strategy="tune", prompt="my-prompt", model="gemini-pro")
        spy.run_structured.assert_awaited_once()
        kwargs = spy.run_structured.call_args.kwargs
        assert kwargs["model"] == "gemini-pro"
        assert kwargs["instruction"] == STRATEGY_INSTRUCTION["tune"]
        assert kwargs["prompt"] == "my-prompt"

    @pytest.mark.asyncio
    async def test_rejects_wrong_return_type(self) -> None:
        class _Other(BaseModel):
            foo: str = "x"

        spy = AsyncMock()
        spy.run_structured = AsyncMock(return_value=_Other())
        with pytest.raises(TypeError):
            await run_candidate(client=spy, strategy="exploit", prompt="p")
