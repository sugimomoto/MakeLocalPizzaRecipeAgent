"""deps.py のテスト — LlmClient ファクトリと Mock 挙動。"""

from __future__ import annotations

import pytest
from pydantic import BaseModel

from makelocal_agent.deps import (
    MockLlmClient,
    get_llm_client,
    reset_llm_client_for_testing,
    set_llm_client_for_testing,
)
from makelocal_agent.lib.settings import Settings, reset_settings_for_testing


class _SampleOut(BaseModel):
    title: str
    tags: list[str]


@pytest.fixture(autouse=True)
def _reset() -> None:
    reset_llm_client_for_testing()
    reset_settings_for_testing()


class TestMockLlmClient:
    @pytest.mark.asyncio
    async def test_returns_instance_of_output_schema(self) -> None:
        client = MockLlmClient()
        out = await client.run_structured(
            model="x",
            instruction="i",
            prompt="p",
            output_schema=_SampleOut,
        )
        assert isinstance(out, _SampleOut)
        assert out.title == "mock-title"
        assert out.tags == ["mock-tags-1", "mock-tags-2"]


class TestFactory:
    def test_returns_mock_when_use_mock_llm_true(self) -> None:
        s = Settings(use_mock_llm=True)
        client = get_llm_client(s)
        assert isinstance(client, MockLlmClient)

    def test_returns_mock_when_no_project_set(self) -> None:
        s = Settings(use_mock_llm=False, google_cloud_project="")
        client = get_llm_client(s)
        assert isinstance(client, MockLlmClient)

    def test_returns_singleton(self) -> None:
        s = Settings(use_mock_llm=True)
        a = get_llm_client(s)
        b = get_llm_client(s)
        assert a is b

    def test_set_for_testing_overrides_singleton(self) -> None:
        custom = MockLlmClient()
        set_llm_client_for_testing(custom)
        assert get_llm_client() is custom
