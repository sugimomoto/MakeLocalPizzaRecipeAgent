"""deps.py のテスト — LlmClient ファクトリと Mock 挙動。"""

from __future__ import annotations

import pytest
from pydantic import BaseModel, Field

from makelocal_agent.agents.imagen_client import MockImagenClient, VertexImagenClient
from makelocal_agent.deps import (
    MockLlmClient,
    get_furusato_cache,
    get_imagen_client,
    get_llm_client,
    get_storage_client,
    reset_furusato_cache_for_testing,
    reset_imagen_client_for_testing,
    reset_llm_client_for_testing,
    reset_storage_client_for_testing,
    set_furusato_cache_for_testing,
    set_imagen_client_for_testing,
    set_llm_client_for_testing,
    set_storage_client_for_testing,
)
from makelocal_agent.furusato.cache import InMemoryFurusatoCache
from makelocal_agent.lib.settings import Settings, reset_settings_for_testing
from makelocal_agent.lib.storage import MockStorageClient


class _SampleOut(BaseModel):
    title: str
    tags: list[str]


class _NestedLeaf(BaseModel):
    name: str
    quantity: str


class _NestedMeta(BaseModel):
    servings: str
    duration: str


class _NestedOut(BaseModel):
    title: str
    meta: _NestedMeta
    items: list[_NestedLeaf] = Field(min_length=3)
    notes: list[str] = Field(min_length=4)


@pytest.fixture(autouse=True)
def _reset() -> None:
    reset_llm_client_for_testing()
    reset_imagen_client_for_testing()
    reset_storage_client_for_testing()
    reset_furusato_cache_for_testing()
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

    @pytest.mark.asyncio
    async def test_fills_nested_basemodel_and_respects_min_length(self) -> None:
        client = MockLlmClient()
        out = await client.run_structured(
            model="x",
            instruction="i",
            prompt="p",
            output_schema=_NestedOut,
        )
        assert isinstance(out, _NestedOut)
        assert out.meta.servings == "mock-servings"
        assert out.meta.duration == "mock-duration"
        assert len(out.items) == 3
        assert out.items[0].name == "mock-name"
        assert out.items[0].quantity == "mock-quantity"
        # list[str] にも min_length が反映される
        assert len(out.notes) == 4


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


class TestImagenFactory:
    def test_returns_mock_when_use_mock_image_true(self) -> None:
        s = Settings(use_mock_image=True, google_cloud_project="some-proj")
        client = get_imagen_client(s)
        assert isinstance(client, MockImagenClient)

    def test_returns_mock_when_use_mock_llm_true(self) -> None:
        # Mock LLM 設定なら画像も Mock 側に揃える (整合性)
        s = Settings(use_mock_llm=True, google_cloud_project="some-proj")
        client = get_imagen_client(s)
        assert isinstance(client, MockImagenClient)

    def test_returns_mock_when_no_project(self) -> None:
        s = Settings(use_mock_image=False, google_cloud_project="")
        client = get_imagen_client(s)
        assert isinstance(client, MockImagenClient)

    def test_returns_vertex_when_project_and_no_mock(self) -> None:
        s = Settings(
            use_mock_llm=False,
            use_mock_image=False,
            google_cloud_project="some-proj",
        )
        client = get_imagen_client(s)
        assert isinstance(client, VertexImagenClient)

    def test_returns_singleton(self) -> None:
        s = Settings(use_mock_image=True)
        assert get_imagen_client(s) is get_imagen_client(s)

    def test_set_for_testing_overrides_singleton(self) -> None:
        custom = MockImagenClient()
        set_imagen_client_for_testing(custom)
        assert get_imagen_client() is custom


class TestStorageFactory:
    def test_returns_mock_when_use_mock_storage_true(self) -> None:
        s = Settings(use_mock_storage=True, google_cloud_project="some-proj")
        assert isinstance(get_storage_client(s), MockStorageClient)

    def test_returns_mock_when_use_mock_llm_true(self) -> None:
        s = Settings(use_mock_llm=True, google_cloud_project="some-proj")
        assert isinstance(get_storage_client(s), MockStorageClient)

    def test_returns_mock_when_use_mock_image_true(self) -> None:
        s = Settings(use_mock_image=True, google_cloud_project="some-proj")
        assert isinstance(get_storage_client(s), MockStorageClient)

    def test_returns_mock_when_no_project(self) -> None:
        s = Settings(google_cloud_project="")
        assert isinstance(get_storage_client(s), MockStorageClient)

    def test_returns_singleton(self) -> None:
        s = Settings(use_mock_storage=True)
        assert get_storage_client(s) is get_storage_client(s)

    def test_set_for_testing_overrides_singleton(self) -> None:
        custom = MockStorageClient(base_url="http://test")
        set_storage_client_for_testing(custom)
        assert get_storage_client() is custom


class TestFurusatoCacheFactory:
    def test_returns_in_memory_when_use_mock_furusato_true(self) -> None:
        s = Settings(
            furusato_integration=True,
            use_mock_furusato=True,
            google_cloud_project="some-proj",
        )
        assert isinstance(get_furusato_cache(s), InMemoryFurusatoCache)

    def test_returns_in_memory_when_integration_off(self) -> None:
        # integration off の状態でも cache singleton としては InMemory を返す
        # (tool 側で _is_disabled でガードする)
        s = Settings(furusato_integration=False, google_cloud_project="some-proj")
        assert isinstance(get_furusato_cache(s), InMemoryFurusatoCache)

    def test_returns_in_memory_when_no_project(self) -> None:
        s = Settings(furusato_integration=True, google_cloud_project="")
        assert isinstance(get_furusato_cache(s), InMemoryFurusatoCache)

    def test_returns_singleton(self) -> None:
        s = Settings(use_mock_furusato=True)
        assert get_furusato_cache(s) is get_furusato_cache(s)

    def test_set_for_testing_overrides_singleton(self) -> None:
        custom = InMemoryFurusatoCache()
        set_furusato_cache_for_testing(custom)
        assert get_furusato_cache() is custom
